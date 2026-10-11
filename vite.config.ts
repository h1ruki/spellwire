import { defineConfig } from 'vitest/config';

export default defineConfig({
  // The game is served from https://<owner>.github.io/spellwire/.
  base: '/spellwire/',
  build: {
    // Phaser ships as one large module; the default 500 kB warning is noise here.
    chunkSizeWarningLimit: 1600,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
