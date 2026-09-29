import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import { consumerUiImportRules } from "../eslint-config/no-mui-imports.mjs";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      ...consumerUiImportRules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    ignores: ["node_modules/**", "dist/**", "build/**", ".next/**", "out/**", "coverage/**"],
  }
);
