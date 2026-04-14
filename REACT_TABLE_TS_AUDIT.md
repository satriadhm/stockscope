# react-table TypeScript Declaration Error — Audit Document

## Date
2026-04-14

## Error Reported by Vercel

```
Type error: Could not find a declaration file for module 'react-table'.
  at ./src/components/features/screener/ScreenerTable.tsx:4:60
```

---

## Phase 0 — Audit Findings

### File Audited
`src/components/features/screener/ScreenerTable.tsx`

### Root Cause

`react-table` v7 is a JavaScript-only package — it ships no bundled TypeScript declarations (`.d.ts` files). When `strict: true` is set in `tsconfig.json` (as it is in this project), TypeScript treats un-typed third-party imports as an error rather than silently allowing an implicit `any` type.

```typescript
// ScreenerTable.tsx line 4
import { useTable, useSortBy, usePagination, Column } from "react-table"; // ❌ No type declarations found
```

### Exports Used in `ScreenerTable.tsx`

| Export | Type | Notes |
|---|---|---|
| `useTable` | hook | core table instance factory |
| `useSortBy` | plugin | sort by column |
| `usePagination` | plugin | pagination support |
| `Column` | type | generic column definition — used as `Column<EnrichedStock>[]` |

### Installed Packages

| Package | Version | Ships types? |
|---|---|---|
| `react-table` | 7.7.0 | ❌ No |
| `@types/react-table` | — (not installed) | — |

### @types availability check

```
npm info @types/react-table
→ @types/react-table@7.7.20 | MIT
```

`@types/react-table` **exists** on DefinitelyTyped at version `7.7.20`, targeting `react-table` v7. No known CVEs.

---

## Resolution Path Selected: Path A — Install `@types/react-table`

### Path A vs Path B Analysis

| | Path A: `npm i -D @types/react-table` | Path B: Manual `.d.ts` file |
|---|---|---|
| **Effort** | Single dependency | Requires writing complex plugin-chain types |
| **Accuracy** | Full community types for all hooks, plugin chaining, generics | Minimal stubs only (loses `Column<T>` generics) |
| **Future-proof** | Updated with upstream changes | Must be updated manually |
| **Recommended?** | ✅ Yes (also per task spec) | ❌ Strongly against for v7 plugin types |
| **Chosen?** | ✅ Yes | — |

**Chosen: Path A.** `react-table` v7 uses a sophisticated plugin-chain type system (`UseTableInstanceProps`, `UseSortByColumnProps`, `UsePaginationInstanceProps`, etc.). The community `@types/react-table@7.7.20` package provides full declarations for all hooks and generic `Column<D>` used in `ScreenerTable.tsx`. A manual stub would lose the generic safety on `Column<EnrichedStock>[]` and all hook return types.

---

## talib Warning Strategy

The `Module not found: Can't resolve 'talib'` warning in `src/services/analysis.ts` is **already resolved** in `next.config.ts`:

```ts
serverExternalPackages: ["talib"],
```

This tells webpack/Turbopack to treat `talib` as an external server-side native binary and skip bundling it, eliminating the warning while preserving the runtime fallback logic in `analysis.ts` for local development.

**No additional action required for talib.**

---

## Files Changed

| File | Change |
|---|---|
| `package.json` | Add `"@types/react-table": "^7.7.20"` to `devDependencies` |
| `CHANGES_SUMMARY.md` | Add Phase 11 entry |
| `REACT_TABLE_TS_AUDIT.md` | This document |
