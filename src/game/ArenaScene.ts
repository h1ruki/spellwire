import Phaser from 'phaser';
import { aimDirection, DEFAULT_AIM } from '../core/aim';
import { chaseVelocity } from '../core/chase';
import { crystalTierIndex, crystalVelocity, dropCrystal } from '../core/crystals';
import type { EnemyConfig, GameData } from '../core/data';
import { createDashState, dashReadiness, stepDash, type DashState } from '../core/dash';
import { createFireState, stepFire, type FireState } from '../core/fire';
import {
  applyDamage,
  createHealth,
  isDead,
  isInvulnerable,
  stepHealth,
  type HealthState,
} from '../core/health';
import { knockbackDisplacement } from '../core/knockback';
import { clampToArena, moveDirection, movementDelta, type Vec2 } from '../core/movement';
import {
  activeSpawnRules,
  createSpawnerState,
  stepSpawner,
  type SpawnerState,
  type SpawnRule,
} from '../core/schedule';
import { roomUnderCap, spawnGroup } from '../core/spawn';
import { addXp, createXpState, xpForNextLevel, type XpState } from '../core/xp';
import { Hud } from '../ui/Hud';
import { ensureShapeTexture } from './shapes';

export const ARENA_WIDTH = 1280;
export const ARENA_HEIGHT = 720;
export const ARENA_BACKGROUND = '#0b0d17';

const ARENA_BORDER_COLOUR = 0x2a3050;

const PLAYER_TEXTURE = 'player';
const PROJECTILE_TEXTURE = 'projectile';
const PROJECTILE_COLOUR = '#f4f7ff';
const PROJECTILE_SIZE = 10;
const crystalTexture = (tier: number): string => `crystal-${tier}`;

/** Enemy hit circles are a little smaller than the drawn shape, to be forgiving. */
const ENEMY_HIT_RADIUS_FRACTION = 0.4;
/** Gap between neighbours in a spawned group, as a multiple of enemy size. */
const SPAWN_SPACING_FACTOR = 1.6;
/** Longest frame the rules are stepped with, e.g. after the tab was in the background. */
const MAX_FRAME_SECONDS = 0.1;
const BLINKS_PER_SECOND = 12;
const BLINK_ALPHA = 0.25;
const HIT_FLASH_COLOUR = 0xffffff;
const LEVEL_NOTICE_SECONDS = 1.5;

const ENEMY_DATA_KEY = 'enemy';
const DIRECTION_DATA_KEY = 'direction';
const VALUE_DATA_KEY = 'value';

type Sprite = Phaser.Physics.Arcade.Image;
type MoveKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

/** Per-enemy state kept on its sprite. */
interface EnemyState {
  config: EnemyConfig;
  health: HealthState;
  /** Seconds of hit flash left; 0 when not flashing. */
  flashSeconds: number;
}

const enemyTexture = (name: string): string => `enemy-${name}`;

export class ArenaScene extends Phaser.Scene {
  private readonly gameData: GameData;
  private player!: Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private crystals!: Phaser.Physics.Arcade.Group;
  private hud!: Hud;
  private keys!: MoveKeys;
  private dashKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;

  private health!: HealthState;
  private dash!: DashState;
  private fire!: FireState;
  private spawner!: SpawnerState;
  private xp!: XpState;
  private aim!: Vec2;
  private elapsedSeconds = 0;
  private levelNoticeSeconds = 0;
  private dead = false;

  constructor(data: GameData) {
    super('Arena');
    this.gameData = data;
  }

  /** Runs at the start of every run, including after a restart, so it resets all state. */
  create(): void {
    const { player, tuning, enemies } = this.gameData;

    this.health = createHealth(tuning.player.maxHealth);
    this.dash = createDashState();
    this.fire = createFireState();
    this.spawner = createSpawnerState();
    this.xp = createXpState();
    this.aim = DEFAULT_AIM;
    this.elapsedSeconds = 0;
    this.levelNoticeSeconds = 0;
    this.dead = false;

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }
    const { KeyCodes } = Phaser.Input.Keyboard;
    // Keys are polled each frame, so a restart leaves no listeners behind.
    this.keys = {
      up: keyboard.addKey(KeyCodes.W),
      down: keyboard.addKey(KeyCodes.S),
      left: keyboard.addKey(KeyCodes.A),
      right: keyboard.addKey(KeyCodes.D),
    };
    this.dashKey = keyboard.addKey(KeyCodes.SPACE);
    this.restartKey = keyboard.addKey(KeyCodes.R);

    this.add
      .graphics()
      .lineStyle(2, ARENA_BORDER_COLOUR)
      .strokeRect(1, 1, ARENA_WIDTH - 2, ARENA_HEIGHT - 2);

    ensureShapeTexture(this, PLAYER_TEXTURE, player.shape, player.colour, player.size);
    for (const [name, config] of Object.entries(enemies)) {
      ensureShapeTexture(this, enemyTexture(name), config.shape, config.colour, config.size);
    }
    ensureShapeTexture(this, PROJECTILE_TEXTURE, 'circle', PROJECTILE_COLOUR, PROJECTILE_SIZE);
    tuning.crystals.tiers.forEach((tier, index) => {
      ensureShapeTexture(this, crystalTexture(index), 'square', tier.colour, tier.size);
    });

    this.crystals = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.player = this.physics.add.image(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, PLAYER_TEXTURE);

    // Enemies push each other apart instead of stacking into one shape.
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.projectiles, this.enemies, (projectile, enemy) => {
      this.hitEnemy(projectile as Sprite, enemy as Sprite);
    });
    this.physics.add.overlap(this.player, this.enemies, (_player, enemy) => {
      this.hitPlayer(enemy as Sprite);
    });
    this.physics.add.overlap(this.player, this.crystals, (_player, crystal) => {
      this.collectCrystal(crystal as Sprite);
    });

    this.hud = new Hud(this);
    this.updateHud();
  }

  update(_time: number, deltaMs: number): void {
    if (this.dead) {
      if (this.restartKey.isDown) {
        this.scene.restart();
      }
      return;
    }

    const deltaSeconds = Math.min(deltaMs / 1000, MAX_FRAME_SECONDS);
    this.elapsedSeconds += deltaSeconds;
    this.levelNoticeSeconds = Math.max(0, this.levelNoticeSeconds - deltaSeconds);

    this.updateAim();
    this.movePlayer(deltaSeconds);
    this.health = stepHealth(this.health, deltaSeconds);
    this.blinkWhileInvulnerable();
    this.fireShots(deltaSeconds);
    this.spawnEnemies(deltaSeconds);
    this.updateEnemies(deltaSeconds);
    this.attractCrystals();
    this.removeProjectilesOutsideArena();
    this.updateHud();
  }

  private updateAim(): void {
    const pointer = this.input.activePointer;
    // Until the mouse first moves over the game the pointer has no real position.
    if (pointer.moveTime === 0 && pointer.downTime === 0) {
      return;
    }
    this.aim = aimDirection(this.player, { x: pointer.worldX, y: pointer.worldY }, this.aim);
  }

  private movePlayer(deltaSeconds: number): void {
    const { tuning, player } = this.gameData;
    const input = {
      up: this.keys.up.isDown,
      down: this.keys.down.isDown,
      left: this.keys.left.isDown,
      right: this.keys.right.isDown,
    };

    const dashStep = stepDash(
      this.dash,
      {
        keyHeld: this.dashKey.isDown,
        moveDirection: moveDirection(input),
        aimDirection: this.aim,
      },
      tuning.dash,
      deltaSeconds,
    );
    this.dash = dashStep.state;

    // The burst replaces normal movement, so the locked direction cannot be steered.
    const step = dashStep.dashing
      ? dashStep.displacement
      : movementDelta(input, tuning.moveSpeed, deltaSeconds);
    const next = clampToArena(
      { x: this.player.x + step.x, y: this.player.y + step.y },
      player.size,
      ARENA_WIDTH,
      ARENA_HEIGHT,
    );
    this.player.setPosition(next.x, next.y);
  }

  private blinkWhileInvulnerable(): void {
    const blinkOff =
      isInvulnerable(this.health) &&
      Math.floor(this.health.invulnerableSeconds * BLINKS_PER_SECOND) % 2 === 0;
    this.player.setAlpha(blinkOff ? BLINK_ALPHA : 1);
  }

  private fireShots(deltaSeconds: number): void {
    const { fire, caps } = this.gameData.tuning;
    const fireStep = stepFire(this.fire, fire.shotsPerSecond, deltaSeconds);
    this.fire = fireStep.state;

    const shots = roomUnderCap(fireStep.shots, this.projectiles.countActive(), caps.maxProjectiles);
    for (let i = 0; i < shots; i++) {
      const projectile = this.projectiles.create(
        this.player.x,
        this.player.y,
        PROJECTILE_TEXTURE,
      ) as Sprite;
      projectile.setCircle(PROJECTILE_SIZE / 2);
      projectile.setVelocity(this.aim.x * fire.projectileSpeed, this.aim.y * fire.projectileSpeed);
      projectile.setData(DIRECTION_DATA_KEY, this.aim);
    }
  }

  private spawnEnemies(deltaSeconds: number): void {
    const rules = activeSpawnRules(this.gameData.spawns, this.elapsedSeconds);
    const step = stepSpawner(this.spawner, rules, deltaSeconds);
    this.spawner = step.state;
    for (const rule of step.due) {
      this.spawnGroupFor(rule);
    }
  }

  private spawnGroupFor(rule: SpawnRule): void {
    const { spawn, caps } = this.gameData.tuning;
    const config = this.gameData.enemies[rule.enemy];
    if (!config) {
      throw new Error(`Unknown enemy "${rule.enemy}" in the spawn timeline.`);
    }

    const positions = spawnGroup({
      count: roomUnderCap(rule.groupSize, this.enemies.countActive(), caps.maxEnemies),
      arenaWidth: ARENA_WIDTH,
      arenaHeight: ARENA_HEIGHT,
      inset: config.size,
      spacing: config.size * SPAWN_SPACING_FACTOR,
      player: this.player,
      minDistanceFromPlayer: spawn.minDistanceFromPlayer,
    });

    const hitRadius = config.size * ENEMY_HIT_RADIUS_FRACTION;
    const hitOffset = config.size / 2 - hitRadius;
    for (const position of positions) {
      const enemy = this.enemies.create(position.x, position.y, enemyTexture(rule.enemy)) as Sprite;
      enemy.setCircle(hitRadius, hitOffset, hitOffset);
      const state: EnemyState = { config, health: createHealth(config.health), flashSeconds: 0 };
      enemy.setData(ENEMY_DATA_KEY, state);
    }
  }

  private updateEnemies(deltaSeconds: number): void {
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Sprite;
      const state = enemy.getData(ENEMY_DATA_KEY) as EnemyState;

      const velocity = chaseVelocity(enemy, this.player, state.config.speed);
      enemy.setVelocity(velocity.x, velocity.y);
      if (velocity.x !== 0 || velocity.y !== 0) {
        // Shapes are drawn pointing up, so turn the tip towards the player.
        enemy.setRotation(Math.atan2(velocity.y, velocity.x) + Math.PI / 2);
      }

      if (state.flashSeconds > 0) {
        state.flashSeconds = Math.max(0, state.flashSeconds - deltaSeconds);
        if (state.flashSeconds === 0) {
          enemy.clearTint();
        }
      }
    }
  }

  private attractCrystals(): void {
    const { pickupRange, crystals } = this.gameData.tuning;
    for (const child of this.crystals.getChildren()) {
      const crystal = child as Sprite;
      const velocity = crystalVelocity(crystal, this.player, pickupRange, crystals.attractSpeed);
      crystal.setVelocity(velocity.x, velocity.y);
    }
  }

  private removeProjectilesOutsideArena(): void {
    const margin = PROJECTILE_SIZE;
    for (const child of [...this.projectiles.getChildren()]) {
      const projectile = child as Sprite;
      if (
        projectile.x < -margin ||
        projectile.x > ARENA_WIDTH + margin ||
        projectile.y < -margin ||
        projectile.y > ARENA_HEIGHT + margin
      ) {
        projectile.destroy();
      }
    }
  }

  private hitEnemy(projectile: Sprite, enemy: Sprite): void {
    // A projectile is spent on its first hit, even if it touches two enemies at once.
    if (!projectile.active || !enemy.active) {
      return;
    }
    const hitDirection = projectile.getData(DIRECTION_DATA_KEY) as Vec2;
    projectile.destroy();

    const { fire, hitFeedback } = this.gameData.tuning;
    const state = enemy.getData(ENEMY_DATA_KEY) as EnemyState;
    state.health = applyDamage(state.health, fire.projectileDamage).state;

    if (isDead(state.health)) {
      this.dropXp(enemy.x, enemy.y, state.config.xp);
      enemy.destroy();
      return;
    }

    if (hitFeedback.flashSeconds > 0) {
      state.flashSeconds = hitFeedback.flashSeconds;
      enemy.setTintFill(HIT_FLASH_COLOUR);
    }
    const push = knockbackDisplacement(
      hitDirection,
      hitFeedback.knockbackStrength,
      state.config.knockbackResistance,
    );
    const pushed = clampToArena(
      { x: enemy.x + push.x, y: enemy.y + push.y },
      state.config.size,
      ARENA_WIDTH,
      ARENA_HEIGHT,
    );
    enemy.setPosition(pushed.x, pushed.y);
  }

  private hitPlayer(enemy: Sprite): void {
    if (this.dead || !enemy.active) {
      return;
    }
    const { player, hitFeedback } = this.gameData.tuning;
    const state = enemy.getData(ENEMY_DATA_KEY) as EnemyState;
    const result = applyDamage(
      this.health,
      state.config.contactDamage,
      player.postHitInvulnerabilitySeconds,
    );
    this.health = result.state;

    if (result.damaged && hitFeedback.shakeIntensity > 0 && hitFeedback.shakeSeconds > 0) {
      // Phaser takes the shake strength as a fraction of the view size.
      this.cameras.main.shake(
        hitFeedback.shakeSeconds * 1000,
        hitFeedback.shakeIntensity / ARENA_WIDTH,
      );
    }
    if (isDead(this.health)) {
      this.die();
    }
  }

  /** Leaves an XP crystal where an enemy died; at the cap an existing crystal absorbs it. */
  private dropXp(x: number, y: number, value: number): void {
    const sprites = this.crystals.getChildren() as Sprite[];
    const existing = sprites.map((sprite) => ({
      x: sprite.x,
      y: sprite.y,
      value: sprite.getData(VALUE_DATA_KEY) as number,
    }));
    const drop = dropCrystal(existing, { x, y, value }, this.gameData.tuning.crystals.maxCrystals);

    // The affected crystal is the one that absorbed the drop, or the new one at the end.
    const index = drop.mergedInto ?? drop.crystals.length - 1;
    const total = drop.crystals[index]?.value ?? value;
    const absorbing = drop.mergedInto === null ? undefined : sprites[index];
    const tiers = this.gameData.tuning.crystals.tiers;
    const tier = crystalTierIndex(tiers, total);
    const size = tiers[tier]?.size ?? 0;
    const crystal = absorbing ?? (this.crystals.create(x, y, crystalTexture(tier)) as Sprite);
    // A crystal's look follows its value, so a merged crystal takes the tier of its new total.
    crystal.setTexture(crystalTexture(tier));
    (crystal.body as Phaser.Physics.Arcade.Body).setSize(size, size);
    crystal.setData(VALUE_DATA_KEY, total);
    crystal.setRotation(Math.PI / 4);
  }

  private collectCrystal(crystal: Sprite): void {
    if (this.dead || !crystal.active) {
      return;
    }
    const value = crystal.getData(VALUE_DATA_KEY) as number;
    crystal.destroy();

    const gain = addXp(this.xp, value, this.gameData.tuning.xp);
    this.xp = gain.state;
    if (gain.levelsGained > 0) {
      // TEMPORARY (M2): a level-up only shows a notice. Play does not pause and
      // nothing is awarded. M3 replaces this with the approved interaction:
      // pause and offer upgrade cards.
      this.levelNoticeSeconds = LEVEL_NOTICE_SECONDS;
    }
  }

  private die(): void {
    this.dead = true;
    this.physics.pause();
    this.player.setAlpha(1);
    this.updateHud();
    this.hud.showDeathPrompt();
  }

  private updateHud(): void {
    this.hud.update({
      health: this.health.current,
      maxHealth: this.health.max,
      dashReadiness: dashReadiness(this.dash, this.gameData.tuning.dash),
      level: this.xp.level,
      xp: this.xp.xp,
      xpForNextLevel: xpForNextLevel(this.xp.level, this.gameData.tuning.xp),
      elapsedSeconds: this.elapsedSeconds,
      levelNotice:
        this.levelNoticeSeconds > 0
          ? { level: this.xp.level, opacity: this.levelNoticeSeconds / LEVEL_NOTICE_SECONDS }
          : null,
    });
  }
}
