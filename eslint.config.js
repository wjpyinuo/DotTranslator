import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // ===== 基础规则 =====
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // ===== 全局严格规则 =====
  {
    ignores: [
      "dist/**", "dist-electron/**", "node_modules/**", "**/package-lock.json",
      "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts",
      "**/vitest.config.ts", "**/playwright.config.ts",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript 基础规则（type-aware 规则在下方按目录调整）
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/explicit-function-return-type": ["warn", { allowExpressions: true }],
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",

      // 通用规则
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-debugger": "error",
      "no-alert": "error",
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": ["error", "always"],
      "curly": ["error", "multi-line"],
    },
  },

  // ===== 渲染进程：严格规则 =====
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "DotStats/src/**/*.ts", "DotStats/src/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-floating-promises": "error",
    },
  },

  // ===== Electron 主进程：放宽 =====
  {
    files: ["electron/**/*.ts", "DotStats/electron/**/*.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-floating-promises": "warn",
      "no-console": "off",
      "no-alert": "off",
    },
  },

  // ===== 服务端：务实规则 =====
  {
    files: ["DotStats/server/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-floating-promises": "warn",
      "no-console": "off",
    },
  },
);
