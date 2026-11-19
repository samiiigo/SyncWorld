// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'web-build/*', '.expo/*', 'node_modules/*'],
  },
  {
    // react-three-fiber JSX (<mesh args position ...>) isn't DOM, so this rule misfires there.
    files: ['src/shared/visuals/**/*.tsx'],
    rules: { 'react/no-unknown-property': 'off' },
  },
  {
    // SDK 56's eslint-config-expo enables the React Compiler rules. They flag long-standing
    // RN idioms in pre-upgrade code (Animated/PanResponder refs, Date.now in render, setState
    // in effects). Kept visible as warnings; clean up incrementally, then restore to 'error'.
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
]);
