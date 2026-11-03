import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
export default tseslint.config(
  { ignores: ['dist/**','node_modules/**','playwright-report/**','test-results/**','release/**','evidence/**','.cache/**','.playwright-browsers/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['**/*.{ts,tsx,js,mjs,cjs}'], languageOptions: { globals: { ...globals.browser, ...globals.node } }, plugins: { 'react-hooks': reactHooks }, rules: { 'react-hooks/rules-of-hooks': 'error', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }], 'no-empty': ['error', { allowEmptyCatch: true }] } },
  { files: ['**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } }
)
