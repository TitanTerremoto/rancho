import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettierConfig,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { parser: tseslint.parser },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      // v-html and innerHTML render untrusted strings as DOM; use {{ }} instead.
      'vue/no-v-html': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "AssignmentExpression[left.property.name='innerHTML']",
          message: 'Do not assign innerHTML - use textContent or Vue template interpolation.',
        },
      ],
    },
  },
  {
    // console.* is banned in src/ - use devLog/devWarn from shared/utils/devTools.ts,
    // which become no-ops in production builds.
    files: ['src/**/*.{ts,vue}'],
    rules: { 'no-console': 'error' },
  },
)
