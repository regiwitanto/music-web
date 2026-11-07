import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/*
 * Layer rules (constitution VIII; 001 research R12; contracts/modules.md).
 * In flat config a later block that sets the same rule replaces the earlier
 * one for overlapping files, so each layer gets one complete pattern list.
 */

const RESTRICTED = "@typescript-eslint/no-restricted-imports";

// Shared bans for every file in src/ except the test fakes themselves.
const noTestImports = {
  group: ["@/test/*", "@/test/**"],
  message: "Test fakes must never reach an app bundle (ui-shell.md §7.2).",
};
// Relative imports that climb out of a folder could bypass the alias bans.
const noParentRelative = {
  group: ["../*", "../**"],
  message: "Use the @/ alias for imports outside this folder, so the layer rules apply.",
};

const domainPatterns = [
  {
    group: ["react", "react-*", "react/*", "next", "next/*", "zustand", "zustand/*", "dexie", "dexie*", "zod", "zod/*"],
    message: "The domain layer must stay pure: no UI framework, state library or storage.",
  },
  {
    group: ["@/application/*", "@/application/**", "@/infrastructure/*", "@/infrastructure/**", "@/presentation/*", "@/presentation/**", "@/app/*", "@/app/**"],
    message: "The domain layer may not depend on any other layer.",
  },
  noTestImports,
  noParentRelative,
];

// Dexie and zod belong to infrastructure (002 plan phase 1; constitution VIII).
const noStorageLibraries = {
  group: ["dexie", "dexie/*", "zod", "zod/*"],
  message: "Dexie and zod are infrastructure only: reach storage through the application ports.",
};

const applicationPatterns = (allowInfrastructure) => [
  {
    group: ["@/presentation/*", "@/presentation/**", "@/app/*", "@/app/**"],
    message: "The application layer may not depend on presentation or routes.",
  },
  noStorageLibraries,
  ...(allowInfrastructure
    ? []
    : [
        {
          group: ["@/infrastructure/*", "@/infrastructure/**"],
          message: "Only src/application/container.ts may import infrastructure.",
        },
      ]),
  noTestImports,
  noParentRelative,
];

const infrastructurePatterns = [
  {
    group: ["@/presentation/*", "@/presentation/**", "@/app/*", "@/app/**"],
    message: "Infrastructure may not depend on presentation or routes.",
  },
  {
    group: ["@/application/*", "@/application/**", "!@/application/ports"],
    message: "Infrastructure may import only types from @/application/ports.",
  },
  {
    group: ["@/application/ports"],
    allowTypeImports: true,
    message: "Infrastructure may import only types from @/application/ports.",
  },
  noTestImports,
  noParentRelative,
];

const uiPatterns = [
  {
    group: ["@/domain/*", "@/domain/**"],
    allowTypeImports: true,
    message: "Presentation and routes import only types from the domain; runtime values come from @/application/shell.",
  },
  {
    group: ["@/infrastructure/*", "@/infrastructure/**"],
    message: "Presentation and routes may not import infrastructure.",
  },
  noStorageLibraries,
  noTestImports,
  noParentRelative,
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      [RESTRICTED]: ["error", { patterns: domainPatterns }],
      "no-restricted-globals": [
        "error",
        ...["window", "document", "localStorage", "sessionStorage", "navigator", "matchMedia"].map((name) => ({
          name,
          message: "The domain layer must not use browser globals.",
        })),
      ],
    },
  },
  {
    files: ["src/application/**/*.{ts,tsx}"],
    ignores: ["src/application/container.ts"],
    rules: { [RESTRICTED]: ["error", { patterns: applicationPatterns(false) }] },
  },
  {
    files: ["src/application/container.ts"],
    rules: { [RESTRICTED]: ["error", { patterns: applicationPatterns(true) }] },
  },
  {
    files: ["src/infrastructure/**/*.{ts,tsx}"],
    rules: { [RESTRICTED]: ["error", { patterns: infrastructurePatterns }] },
  },
  {
    files: ["src/app/**/*.{ts,tsx}", "src/presentation/**/*.{ts,tsx}"],
    rules: { [RESTRICTED]: ["error", { patterns: uiPatterns }] },
  },
  {
    // Test-hook isolation (ui-shell.md §7.2): only the hook modules read the flag.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/presentation/testing/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[property.name='NEXT_PUBLIC_TEST_HOOKS']",
          message: "Only src/presentation/testing/** may read NEXT_PUBLIC_TEST_HOOKS.",
        },
      ],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test and tool output:
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
