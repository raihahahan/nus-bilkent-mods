# NUS SEP module planner

A minimal Next.js timetable planner for NUS students going on exchange. Select a partner university, search by either university's module code/title, view approved mappings and credits, choose sections, and spot timetable clashes. The included adapters currently support Bilkent University and UC Riverside.

## Data

- Bilkent offerings include snapshot for 2026–27 Fall (`20261`) and contains the approved mapped modules that are actually offered.
- UC Riverside offerings use the official Fall 2026 (`202640`) Banner schedule, including linked class components.
- Mapping approval and future offerings can change. Always verify links before submitting an exchange application.

## Run

```bash
npm install
npm run fetch:bilkent  # refresh the 2026–27 Fall STARS data
npm run fetch:ucr      # refresh the Fall 2026 UCR Banner data
npm run dev
```

Then open http://localhost:3000.

## Add another university

Partner-specific configuration and normalized data live in `adapters/`. Copy a reference adapter, implement the university's official offerings fetcher, then register it in `adapters/index.ts`. See `adapters/README.md` or use the in-app `+` guide and its copyable AI prompt.
