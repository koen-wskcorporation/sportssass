import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname
});

const config = [
  {
    ignores: [".next/**", "node_modules/**", "out/**", "dist/**"]
  },
  ...compat.config({
    extends: ["next/core-web-vitals"]
  })
];

export default config;
