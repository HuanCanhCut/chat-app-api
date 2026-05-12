import eslintPluginPrettier from 'eslint-plugin-prettier'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import globals from 'globals'
import tseslint from 'typescript-eslint'

import pluginJs from '@eslint/js'

export default [
    {
        ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/out/**', '**/public/**', '*.config.js'],
    },
    { files: ['**/*.{js,mjs,cjs,ts}'] },
    { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: {
            prettier: eslintPluginPrettier,
            'simple-import-sort': simpleImportSort,
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_$',
                    varsIgnorePattern: '^_$',
                    caughtErrorsIgnorePattern: '^_$',
                },
            ],
            'prettier/prettier': [
                'warn',
                {
                    tabWidth: 4,
                    printWidth: 120,
                    semi: false,
                    singleQuote: true,
                    arrowParens: 'always',
                    endOfLine: 'auto',
                },
            ],
            'simple-import-sort/imports': [
                'warn',
                {
                    groups: [['^\\w'], ['^']],
                },
            ],
            'simple-import-sort/exports': 'warn',
        },
    },
]
