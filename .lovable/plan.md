## Problem

The preview loads unstyled HTML and hydration crashes because `vite.config.ts` sets:

```ts
vite: { base: '/avax-hero-forge/' }
```

That base was intended for a (currently commented-out) GitHub Pages workflow, but TanStack Start / Lovable serves the app from `/`. With a non-root base:

- The SSR server entry renders links to `/avax-hero-forge/src/styles.css`, `/avax-hero-forge/@id/...`, etc.
- Vite's dev server and the Nitro SSR handler don't agree on the base, so some module URLs 404 while others load — the client bundle loads partially, hydration fails ("initial UI does not match"), and React falls back to client render which then errors, leaving the raw SSR HTML with missing CSS/JS.
- Every existing runtime error stack shows `/avax-hero-forge/node_modules/.vite/deps/react-dom-...` — proof the base is warping module resolution.

## Fix

Single-line change in `vite.config.ts`: remove the `vite: { base: ... }` block. TanStack Start runs at `/` in both preview and Lovable's published Cloudflare Worker. GitHub Pages deployment is not the target — the workflow is commented out and the project uses server functions / SSR that Pages can't host anyway.

```ts
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
```

## Verify

1. Reload `/leaderboard` — expect full styled UI, no hydration error in console.
2. Reload `/` — hero renders with gradients, framer-motion animations run.
3. Navigate `/quests`, `/admin` (after auth) — no regressions.

If the user later wants a GitHub Pages build, that's a separate static-export effort (TanStack Start SSR doesn't deploy to Pages as-is).

## Out of scope

No route, component, or styling changes — the app code is fine; only the base path is wrong.