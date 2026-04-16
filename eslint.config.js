import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // ===== 基础规则 =====
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  // ===== 全局严格规则 =====
  {
    ignores: ["dist/**", "dist-electron/**", "node_modules/**", "**/package-lock.json"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // TypeScript 严格模式
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/explicit-function-return-type": ["warn", { allowExpressions: true }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",

      // 通用严格规则
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-debugger": "error",
      "no-alert": "error",
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": ["error", "always"],
      "curly": ["error", "multi-line"],
    },
  },

  // ===== Electron 主进程放宽部分规则 =====
  {
    files: ["electron/**/*.ts", "DotStats/electron/**/*.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-console": "off", // 主进程允许 console
    },
  },

  // ===== 服务端放宽部分规则 =====
  {
    files: ["DotStats/server/**/*.ts"],
    rules: {
      "no-console": "off", // 服务端 logger
      "@typescript-eslint/no-floating-promises": "warn", // cron 任务中异步无需 await
    },
  },
);
