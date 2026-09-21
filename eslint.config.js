import next from "@onwei/config/eslint/next";

// Root-level fallback only, for tools that invoke `eslint` from the repo
// root across files spanning multiple workspaces (husky/lint-staged on a
// commit). ESLint's flat config resolves the nearest eslint.config.js from
// the CWD it's invoked in — a normal `npm run lint` inside any package still
// uses that package's own eslint.config.js, unaffected by this file. Reuses
// the Next-flavored config (a superset of base) since it's harmless on
// non-React packages and avoids duplicating per-workspace glob scoping here.
export default next;
