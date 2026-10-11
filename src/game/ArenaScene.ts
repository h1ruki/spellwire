import Phaser from 'phaser';
import { aimDirection, DEFAULT_AIM } from '../core/aim';
import { chaseVelocity } from '../core/chase';
import type { GameData } from '../core/data';
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
import { clampToArena, moveDirection, movementDelta, type Vec2 } from '../core/movement';
import { roomUnderCap, spawnGroup } from '../core/spawn';
import { stepRepeatingTimer } from '../core/timer';
import { Hud } from '../ui/Hud';
import { ensureShapeTexture } from './shapes';

export const ARENA_WIDTH = 1280;
export const ARENA_HEIGHT = 720;
export const ARENA_BACKGROUND = '#0b0d17';

const ARENA_BORDER_COLOUR = 0x2a3050;

const PLAYER_TEXTURE = 'player';
const SWARMER_TEXTURE = 'swarmer';
const PROJECTILE_TEXTURE = 'projectile';
const PROJECTILE_COLOUR = '#f4f7ff';
const PROJECTILE_SIZE = 10;

/** Enemy hit circles are a little smaller than the drawn shape, to be forgiving. */
const ENEMY_HIT_RADIUS_FRACTION = 0.4;
/** Gap between neighbours in a spawned group, as a multiple of enemy size. */
const SPAWN_SPACING_FACTOR = 1.6;
/** Longest frame the rules are stepped with, e.g. after the tab was in the background. */
const MAX_FRAME_SECONDS = 0.1;
const BLINKS_PER_SECOND = 12;
const BLINK_ALPHA = 0.25;
const HEALTH_DATA_KEY = 'health';

type Sprite = Phaser.Physics.Arcade.Image;
type MoveKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

export class ArenaScene extends Phaser.Scene {
  private readonly gameData: GameData;
  private player!: Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private hud!: Hud;
  private keys!: MoveKeys;
  private dashKey!: Phaser.Input.Keyboard.Key;
  private restartKey!: Phaser.Input.Keyboard.Key;

  private health!: HealthState;
  private dash!: DashState;
  private fire!: FireState;
  private aim!: Vec2;
  private spawnElapsedSeconds = 0;
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
    this.aim = DEFAULT_AIM;
    this.spawnElapsedSeconds = 0;
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
    ensureShapeTexture(
      this,
      SWARMER_TEXTURE,
      enemies.swarmer.shape,
      enemies.swarmer.colour,
      enemies.swarmer.size,
    );
    ensureShapeTexture(this, PROJECTILE_TEXTURE, 'circle', PROJECTILE_COLOUR, PROJECTILE_SIZE);

    this.projectiles = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.player = this.physics.add.image(ARENA_WIDTH / 2, ARENA_HEIGHT / 2, PLAYER_TEXTURE);

    // Enemies push each other apart instead of stacking into one shape.
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.projectiles, this.enemies, (projectile, enemy) => {
      this.hitEnemy(projectile as Sprite, enemy as Sprite);
    });
    this.physics.add.overlap(this.player, this.enemies, () => {
      this.hitPlayer();
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

    this.updateAim();
    this.movePlayer(deltaSeconds);
    this.health = stepHealth(this.health, deltaSeconds);
    this.blinkWhileInvulnerable();
    this.fireShots(deltaSeconds);
    this.spawnEnemies(deltaSeconds);
    this.steerEnemies();
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
    }
  }

  private spawnEnemies(deltaSeconds: number): void {
    const { spawn, caps } = this.gameData.tuning;
    const swarmer = this.gameData.enemies.swarmer;

    const timer = stepRepeatingTimer(
      this.spawnElapsedSeconds,
      spawn.intervalSeconds,
      deltaSeconds,
      1,
    );
    this.spawnElapsedSeconds = timer.elapsedSeconds;
    if (timer.due === 0) {
      return;
    }

    const positions = spawnGroup({
      count: roomUnderCap(spawn.groupSize, this.enemies.countActive(), caps.maxEnemies),
      arenaWidth: ARENA_WIDTH,
      arenaHeight: ARENA_HEIGHT,
      inset: swarmer.size,
      spacing: swarmer.size * SPAWN_SPACING_FACTOR,
      player: this.player,
      minDistanceFromPlayer: spawn.minDistanceFromPlayer,
    });

    const hitRadius = swarmer.size * ENEMY_HIT_RADIUS_FRACTION;
    const hitOffset = swarmer.size / 2 - hitRadius;
    for (const position of positions) {
      const enemy = this.enemies.create(position.x, position.y, SWARMER_TEXTURE) as Sprite;
      enemy.setCircle(hitRadius, hitOffset, hitOffset);
      enemy.setData(HEALTH_DATA_KEY, createHealth(swarmer.health));
    }
  }

  private steerEnemies(): void {
    const speed = this.gameData.enemies.swarmer.speed;
    for (const child of this.enemies.getChildren()) {
      const enemy = child as Sprite;
      const velocity = chaseVelocity(enemy, this.player, speed);
      enemy.setVelocity(velocity.x, velocity.y);
      if (velocity.x !== 0 || velocity.y !== 0) {
        // The triangle texture points up, so turn its tip towards the player.
        enemy.setRotation(Math.atan2(velocity.y, velocity.x) + Math.PI / 2);
      }
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
    projectile.destroy();

    const health = enemy.getData(HEALTH_DATA_KEY) as HealthState;
    const result = applyDamage(health, this.gameData.tuning.fire.projectileDamage);
    if (isDead(result.state)) {
      enemy.destroy();
    } else {
      enemy.setData(HEALTH_DATA_KEY, result.state);
    }
  }

  private hitPlayer(): void {
    if (this.dead) {
      return;
    }
    const result = applyDamage(
      this.health,
      this.gameData.enemies.swarmer.contactDamage,
      this.gameData.tuning.player.postHitInvulnerabilitySeconds,
    );
    this.health = result.state;
    if (isDead(this.health)) {
      this.die();
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
    this.hud.update(
      this.health.current,
      this.health.max,
      dashReadiness(this.dash, this.gameData.tuning.dash),
    );
  }
}
