module.exports = {
    root: true,
    plugins: [
        '@typescript-eslint',
    ],
    env: {
        node: true,
        es6: true,
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/strict-type-checked',
        'plugin:@typescript-eslint/stylistic-type-checked',
    ],
    reportUnusedDisableDirectives: true,
    parserOptions: {
        sourceType: 'module',
        project: true,
        allowAutomaticSingleRunInference: true,
        tsconfigRootDir: __dirname,
        warnOnUnsupportedTypeScriptVersion: false,
    },
    parser: '@typescript-eslint/parser',
    rules: {
        'no-trailing-spaces': 'error',
        'max-len': ['error', {
            'code': 140,
            'ignoreComments': true
        }],

        '@typescript-eslint/ban-ts-comment': ['error', {
            'ts-ignore': false,
            'ts-expect-error': false,
            'ts-nocheck': true,
            'ts-check': true
        }],

        '@typescript-eslint/naming-convention': ['error', {
            'selector': 'variableLike',
            'format': ['camelCase', 'UPPER_CASE'],
            'leadingUnderscore': 'forbid',
            'trailingUnderscore': 'forbid'
        }, {
            'selector': 'typeLike',
            'format': ['PascalCase'],
            'leadingUnderscore': 'forbid',
            'trailingUnderscore': 'forbid'
        }, {
            'selector': 'interface',
            'format': ['PascalCase'],
            'leadingUnderscore': 'forbid',
            'trailingUnderscore': 'forbid',
            'prefix': ['I']
        }],

        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/no-dynamic-delete': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-confusing-void-expression': 'off',
        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
        '@typescript-eslint/prefer-string-starts-ends-with': 'off',
        '@typescript-eslint/no-useless-constructor': 'off'
    }
}