# Partner university adapters

The planner UI consumes normalized partner configurations and datasets registered in `adapters/index.ts`. Bilkent is the original reference adapter. UC Riverside demonstrates exact-time meetings and linked lecture, lab and discussion choices.

To add a university:

1. Copy `adapters/bilkent/` to `adapters/<university-id>/` and edit `config.json`.
2. Filter the NUS mapping source for that partner into the same shape as `adapters/bilkent/mappings.json`.
3. Implement an offerings fetcher that emits the normalized course/section/schedule shape documented in `adapters/bilkent/README.md`.
4. Import the new adapter in `adapters/index.ts` and add it to `availableAdapters`; it will then appear in the university dropdown.
5. Build and verify its links, credits, document, update timestamp, time-slot conversion, persistence and conflicts.

To contribute a university to the shared planner, open a pull request containing the adapter, its refresh script and registry entry. Alternatively, keep the same changes in your own fork and deploy it independently.

Universities without public section/timetable data can still expose NUS mappings; their mappings will simply show as not currently offered.
