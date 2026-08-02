# UC Riverside adapter

This adapter uses UC Riverside's public Ellucian Banner class search for official Fall 2026 sections, linked components, instructors, rooms and meeting times.

Run `npm run fetch:ucr` to refresh `offerings.json`. The fetcher only requests the three departments represented by the approved mappings, works sequentially, pauses between requests and retries transient failures.

UCR Banner does not expose reliable public course-specific URLs, so course links use the official UCR class-search page configured in `config.json`.

Linked lecture, laboratory and discussion requirements are read from Banner's linked-section response. Each valid option is stored as one selectable timetable section. Courses absent from the official Fall 2026 results remain visible as approved mappings but are marked not offered.

Mappings are the UC Riverside rows from the normalized NUS exchange mapping dataset. They currently cover the NUS School of Computing only.
