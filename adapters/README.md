# Partner university adapters

The planner UI consumes one normalized partner configuration and two normalized datasets. Bilkent is the reference adapter in `adapters/bilkent/`.

To add a university:

1. Copy `adapters/bilkent/` to `adapters/<university-id>/` and edit `config.json`.
2. Filter the NUS mapping source for that partner into the same shape as `adapters/bilkent/mappings.json`.
3. Implement an offerings fetcher that emits the normalized course/section/schedule shape documented in `adapters/bilkent/README.md`.
4. Export the new adapter from `adapters/active.ts`, then build and verify links, credits, time-slot conversion and conflicts.

Universities without public section/timetable data can still expose NUS mappings; their mappings will simply show as not currently offered.
