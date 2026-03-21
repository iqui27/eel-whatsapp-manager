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
      // Unescaped entities: warn only (JSX quotes in Portuguese text)
      "react/no-unescaped-entities": "warn",
      // prefer-const is already enforced by TypeScript
      "prefer-const": "warn",
      // setState in effects is a valid pattern in many existing components; downgrade to warn
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
