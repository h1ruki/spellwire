import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  tseslint.configs.strict,
  {
    // Gameplay rules must stay independent of the engine (see CLAUDE.md).
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'phaser', message: 'src/core must not import Phaser.' }],
          patterns: [
            { group: ['**/game/**', '**/ui/**'], message: 'src/core must not import engine code.' },
          ],
        },
      ],
    },
  },
);
