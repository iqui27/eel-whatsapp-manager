import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Project-level rule overrides
  {
    rules: {
      // React compiler rules are informational — not blocking for this project
      "react-compiler/react-compiler": "warn",
      // Unescaped entities: warn only (JSX quotes in Portuguese text)
      "react/no-unescaped-entities": "warn",
      // prefer-const is already enforced by TypeScript
      "prefer-const": "warn",
    },
  },
]);

export default eslintConfig;
