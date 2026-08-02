# Bilkent adapter

`config.json` contains every partner-facing label, term identifier, link template and persistence/export identifier used by the UI.

The fetcher is `scripts/fetch-bilkent.mjs`. It reads the semester from `config.json` and writes `offerings.json` in this normalized form:

```json
{
  "CS": {
    "CS 121": {
      "name": "Course title",
      "sections": {
        "1": {
          "instructor": "Instructor",
          "schedule": { "0": "Room" }
        }
      }
    }
  }
}
```

Schedule keys are zero-based hourly cells with days changing fastest: `day = key % 7`, `hour = floor(key / 7)`. A different university scraper must translate its meetings into this representation or extend the shared schedule model.
