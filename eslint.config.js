import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

const tsNoUnusedExpressions = [
  "error",
  { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true },
];

export default tseslint.config(
  {
    ignores: [
      "dist",
      "coverage",
      "playwright-report",
      "test-results",
      "sbom",
      "src-tauri/target",
      "**/*.timestamp-*",
      "**/*.timestamp-*.mjs",
    ],
  },
  {
    extends: [js.configs.recommended],
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: globals.node,
    },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: [
      "vite.config.ts",
      "vitest.config.ts",
      "playwright.config.ts",
      "types/**/*.d.ts",
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-unused-expressions": tsNoUnusedExpressions,
    },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["tests/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-expressions": tsNoUnusedExpressions,
    },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["e2e/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-unused-expressions": tsNoUnusedExpressions,
    },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-expressions": tsNoUnusedExpressions,
    },
  }
);
