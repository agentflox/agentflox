import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // 👈 Disable globally
      "@typescript-eslint/no-empty-object-type": "off", // Optional - silence empty interface warnings
      "react/no-unescaped-entities": "off", // Ignore apostrophe & quote warnings in JSX
      "no-var": "off", // 👈 allow `var` again
    },
  },
];

export default eslintConfig;
