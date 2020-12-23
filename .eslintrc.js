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
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
	],
	parserOptions: {
        sourceType: 'module',
		project: [
			'./tsconfig.json',
		],
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

        '@typescript-eslint/no-inferrable-types': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/prefer-regexp-exec': 'off',
        '@typescript-eslint/restrict-plus-operands': 'off',

        '@typescript-eslint/array-type': ['error', {
            'default': 'array'
        }],
        '@typescript-eslint/ban-ts-comment': ['error', {
            'ts-ignore': false,
            'ts-expect-error': false,
            'ts-nocheck': true,
            'ts-check': true
        }],
        '@typescript-eslint/ban-tslint-comment': 'error',

        'brace-style': 'off',
        '@typescript-eslint/brace-style': ['error', '1tbs'],

        '@typescript-eslint/class-literal-property-style': ['error', 'fields'],

        'comma-dangle': 'off',
        '@typescript-eslint/comma-dangle': ['error', {
            'arrays': 'always-multiline',
            'objects': 'always-multiline',
            'imports': 'never',
            'exports': 'never',
            'functions': 'never'
        }],

        'comma-spacing': 'off',
        '@typescript-eslint/comma-spacing': 'error',

        '@typescript-eslint/consistent-type-assertions': ['error', {
            'assertionStyle': 'as',
            'objectLiteralTypeAssertions': 'never'
        }],
        '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
        '@typescript-eslint/consistent-type-imports': ['error', {
            'prefer': 'type-imports',
            'disallowTypeAnnotations': false
        }],

        'func-call-spacing': 'off',
        '@typescript-eslint/func-call-spacing': 'error',

        'keyword-spacing': 'off',
        '@typescript-eslint/keyword-spacing': 'error',

        'lines-between-class-members': 'off',
        '@typescript-eslint/lines-between-class-members': ['error', {
            'exceptAfterSingleLine': true
        }],

        '@typescript-eslint/member-ordering': ['error', {
            'default': {
                'memberTypes': [
                    // Index signature
                    'signature',
                    
                    // Fields
                    'public-abstract-field',
                    'protected-abstract-field',
                    'private-abstract-field',
                    'public-static-field',
                    'protected-static-field',
                    'private-static-field',
                    'public-instance-field',
                    'protected-instance-field',
                    'private-instance-field',
                    
                    // Constructors
                    'public-constructor',
                    'protected-constructor',
                    'private-constructor',
                    
                    // Methods
                    'public-abstract-method',
                    'protected-abstract-method',
                    'private-abstract-method',
                    'public-static-method',
                    'protected-static-method',
                    'private-static-method',
                    'public-instance-method',
                    'protected-instance-method',
                    'private-instance-method'
                ],
                'order': 'as-written'
            }
        }],

        '@typescript-eslint/method-signature-style': 'error',

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
          },
          {
            'selector': 'interface',
            'format': ['PascalCase'],
            'leadingUnderscore': 'forbid',
            'trailingUnderscore': 'forbid',
            'prefix': ['I']
          }
        ],

        'no-array-constructor': 'off',
        '@typescript-eslint/no-array-constructor': 'error',

        '@typescript-eslint/no-base-to-string': 'error',
        '@typescript-eslint/no-confusing-non-null-assertion': 'error',

        'no-dupe-class-members': 'off',
        '@typescript-eslint/no-dupe-class-members': 'error',

        'no-duplicate-imports': 'off',
        '@typescript-eslint/no-duplicate-imports': 'error',

        'no-extra-parens': 'off',
        '@typescript-eslint/no-extra-parens': ['error', 'all', {
            'nestedBinaryExpressions': false
        }],

        '@typescript-eslint/no-extra-semi': 'error',

        'no-invalid-this': 'off',
        '@typescript-eslint/no-invalid-this': 'error',

        '@typescript-eslint/no-invalid-void-type': 'error',
        '@typescript-eslint/no-misused-promises': 'error',

        'no-redeclare': 'off',
        '@typescript-eslint/no-redeclare': 'error',

        'no-shadow': 'off',
        '@typescript-eslint/no-shadow': 'error',

        '@typescript-eslint/no-throw-literal': 'error',
        '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
        '@typescript-eslint/no-unnecessary-condition': 'error',
        '@typescript-eslint/no-unnecessary-type-arguments': 'error',
        '@typescript-eslint/no-unnecessary-type-constraint': 'error',

        'no-unused-expressions': 'off',
        '@typescript-eslint/no-unused-expressions': 'error',

        '@typescript-eslint/prefer-for-of': 'error',
        '@typescript-eslint/prefer-ts-expect-error': 'error',
        '@typescript-eslint/promise-function-async': 'error',

        'semi': 'off',
        '@typescript-eslint/semi': ['error', 'always'],

        'space-before-function-paren': 'off',
        '@typescript-eslint/space-before-function-paren': ['error', 'never'],

        'space-infix-ops': 'off',
        '@typescript-eslint/space-infix-ops': 'error',

        '@typescript-eslint/type-annotation-spacing': 'error',
    }
}