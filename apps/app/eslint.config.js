// Regras da arquitetura por features (ver CLAUDE.md). Um import proibido quebra o lint.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const boundaries = require('eslint-plugin-boundaries');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*', 'android/*', 'ios/*'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'route', pattern: 'src/app' },
        { type: 'feature', pattern: 'src/features/*', capture: ['feature'] },
        { type: 'shared', pattern: 'src/shared/*', capture: ['module'] },
      ],
    },
    rules: {
      'boundaries/no-unknown-files': 2,
      'boundaries/dependencies': [
        2,
        {
          default: 'disallow',
          policies: [
            // Rotas são finas: só apontam para a porta da frente de uma feature, ou usam shared.
            {
              from: { element: { type: 'route' } },
              allow: { to: { element: { types: ['route', 'shared'] } } },
            },
            {
              from: { element: { type: 'route' } },
              allow: { to: { element: { type: 'feature', fileInternalPath: 'index.ts' } } },
            },
            // Feature: livre dentro de si mesma…
            {
              from: { element: { type: 'feature' } },
              allow: {
                to: { element: { type: 'feature', captured: { feature: '{{ from.element.captured.feature }}' } } },
              },
            },
            // …outra feature só pelo index.ts (regra 2); shared à vontade.
            {
              from: { element: { type: 'feature' } },
              allow: { to: { element: { type: 'feature', fileInternalPath: 'index.ts' } } },
            },
            {
              from: { element: { type: 'feature' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            // shared nunca importa features (regra 4).
            {
              from: { element: { type: 'shared' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            // Pacotes externos (react, expo, @vida/domain…) são livres.
            { allow: { to: { module: { origin: ['external', 'core'] } } } },
          ],
        },
      ],
      // Nada de cores soltas: elas vivem só em shared/ui/theme/tokens.ts.
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
          message: 'Use as cores do tema (useTheme/makeStyles), não hex solto.',
        },
      ],
    },
  },
  {
    files: ['src/shared/ui/theme/tokens.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]);
