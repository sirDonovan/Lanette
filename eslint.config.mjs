import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config({
    extends: [
        eslint.configs.recommended,
        tseslint.configs.strictTypeChecked,
        tseslint.configs.stylisticTypeChecked,
        {
            languageOptions: {
                parserOptions: {
                    projectService: true,
                    tsconfigRootDir: import.meta.dirname,
                },
            },
        },
    ],
    files: [
        "**/*.ts",
        "**/*.tsx"
    ],
    rules: {
        "@typescript-eslint/prefer-optional-chain": "off",
        "@typescript-eslint/prefer-nullish-coalescing": "off",
        "@typescript-eslint/restrict-plus-operands": "off",
        "@typescript-eslint/no-dynamic-delete": "off",
        "@typescript-eslint/no-deprecated": "off",
        "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-inferrable-types": "off",
        "@typescript-eslint/no-confusing-void-expression": "off",
        "@typescript-eslint/no-unnecessary-type-parameters": "off",
        "@typescript-eslint/prefer-string-starts-ends-with": "off",
        "@typescript-eslint/prefer-regexp-exec": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/ban-ts-comment": ['error', {
            'ts-check': true,
            'ts-expect-error': false,
            'ts-ignore': true,
            'ts-nocheck': true,
        }],
        "@typescript-eslint/no-require-imports": ['error', {
            allowAsImport: true
        }]
    }
}, {
    ignores: [
        ".github/*",
        ".vscode/*",
        "archived-databases/*",
        "build/*",
        "client-data/*",
        "data/*",
        "databases/*",
        "errors/*",
        "game-debug-logs/*",
        "Lanette-private/*",
        "local-utils/*",
        "pokemon-showdown/*",
        "private-data/*",
        "roomlogs/*",
        "runtime-output/*",
        "src/config.ts",
        "src/local-scripts/*",
        "web/*",
    ]
});