# NUS Bilkent module planner

A minimal Next.js timetable planner for NUS students going on exchange to Bilkent. Search by either university's module code/title, view approved mappings and credits, choose a Bilkent section, and spot timetable clashes.

## Data

- Bilkent offerings include snapshot for 2026–27 Fall (`20261`) and contains the approved mapped modules that are actually offered.
- Mapping approval and future offerings can change. Always verify links before submitting an exchange application.

## Run

```bash
npm install
npm run fetch:bilkent  # refresh the 2026–27 Fall STARS data
npm run dev
```

Then open http://localhost:3000.

## Add another university

Partner-specific configuration and normalized data live in `adapters/`. Copy the Bilkent reference adapter, implement the university's official offerings fetcher, then switch the single export in `adapters/active.ts`. See `adapters/README.md` or use the in-app **Map another university?** guide and its copyable AI prompt.
