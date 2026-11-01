# Repository Guidelines

## Project Structure & Module Organization

Nightshift DJ is a local-first, two-deck browser application using React, TypeScript, Vite, AudioWorklet, and C++ WebAssembly DSP.

- `src/`: UI (`main.tsx`, `editor.tsx`), audio engine (`audio.ts`), IndexedDB helpers (`db.ts`), and styles (`style.css`).
- `public/`: audio processor, analysis worker, and compiled `dsp.wasm`.
- `dsp/mixer.cpp`: original DSP source; `scripts/` contains WASM compilation and smoke tests.
- `Dockerfile`, `compose.yaml`, and `docker/nginx.conf`: production packaging and static serving.
- `mixxx/`: separate reference checkout with its own licensing; excluded from the application build. Do not copy its code or assets into the app without reviewing licensing.

## Build, Test, and Development Commands

Use Node 22.12+ or 24 and npm. Full builds require Emscripten or Clang with wasm32 support and wasm-ld.

- `npm install`: install dependencies.
- `npm run dev`: start Vite at `http://localhost:5173`.
- `npm run build`: compile WASM, type-check TypeScript, and build `dist/`.
- `npm run build:wasm`: regenerate `public/dsp.wasm` after DSP changes.
- `npm run preview`: serve the production build locally.
- `docker compose up -d --build`: build and serve on port 8080; override with `WEB_DJ_PORT`.

## Coding Style & Naming Conventions

Follow adjacent code: compact formatting, single-quoted JavaScript strings, camelCase functions and variables, and PascalCase React components and types. Preserve existing indentation rather than reformatting whole files. Use `.tsx` for JSX and `.ts` for non-UI modules. No dedicated formatter or lint command is configured.

Keep audio rendering free of explicit allocations, blocking I/O, fetching, and logging. Coordinate DSP exports with the worklet and build script.

## Testing Guidelines

`node scripts/smoke-dsp.mjs` checks the actual worklet and WASM using generated PCM. `npm run smoke` runs browser assertions against the dev server; install Playwright separately and set `CHROME_PATH` if needed. Smoke scripts follow `scripts/smoke*.mjs`; no coverage threshold is configured.

For application changes, use the build and one relevant smoke test. For documentation-only edits, review the changed text; avoid unnecessary builds.

## Commit & Pull Request Guidelines

No root Git history is available to establish commit conventions. Use concise, imperative subjects describing the change. PRs should explain behavior, list validation performed, link relevant issues, and include screenshots for visible UI changes.

## Configuration & Data

AudioWorklet requires HTTPS or localhost. Preserve the browser origin to retain access to IndexedDB metadata; original audio files are not persisted.
