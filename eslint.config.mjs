import eslintPluginPrettier from 'eslint-plugin-prettier'
import globals from 'globals'
import pluginJs from '@eslint/js'
import tseslint from 'typescript-eslint'

export default [
    { files: ['**/*.{js,mjs,cjs,ts}'] },
    { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: {
            prettier: eslintPluginPrettier,
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'warn',
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
        },
        ignores: ['**/node_modules/', '**/dist/'],
    },
]
