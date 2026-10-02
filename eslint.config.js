import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** Packages and layers the pure domain must never import. */
const forbiddenInDomain = [
  { group: ["discord.js", "@aws-sdk/*", "@typesafe-ai/*", "zod", "node:*"], message: "The domain layer must stay free of SDKs and I/O." },
  { group: ["**/adapters/**", "**/app/**"], message: "The domain layer must not depend on outer layers." },
];

export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/domain/**/*.ts"],
    ignores: ["src/domain/**/*.test.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: forbiddenInDomain }] },
  },
  {
    files: ["src/adapters/**/*.ts"],
    ignores: ["src/adapters/**/*.test.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["**/app/**"], message: "Adapters must not depend on the wiring layer." }] }],
    },
  },
);
