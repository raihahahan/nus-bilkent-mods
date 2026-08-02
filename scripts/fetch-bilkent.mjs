import { load } from "cheerio";
import { mkdir, writeFile, readFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../adapters/bilkent/config.json", import.meta.url), "utf8"));
const semester = process.argv[2] || config.term.code;
const api = "https://stars.bilkent.edu.tr/homepage/ajax";
const departments = JSON.parse(await readFile(new URL("../adapters/bilkent/departments.json", import.meta.url), "utf8"));
const mappings = JSON.parse(await readFile(new URL("../adapters/bilkent/mappings.json", import.meta.url), "utf8"));
const mappedCodes = new Set(mappings.flatMap(row => [row.puCourse1, row.puCourse2]).filter(Boolean).map(code => code.replace(/\s+/g, "").toUpperCase()));
const mappedDepartments = new Set([...mappedCodes].map(code => code.match(/^[A-Z]+/)?.[0]).filter(Boolean));

async function get(url, attempt = 1) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    if (attempt >= 5) throw error;
    await new Promise(resolve => setTimeout(resolve, attempt * 2500));
    return get(url, attempt + 1);
  }
}
async function batches(items, size, work) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(...await Promise.all(items.slice(i, i + size).map(work)));
    process.stdout.write(`\rFetched ${Math.min(i + size, items.length)}/${items.length}`);
    await new Promise(resolve => setTimeout(resolve, 180));
  }
  process.stdout.write("\n");
  return result;
}

const relevantDepartments = departments.filter(department => mappedDepartments.has(department.code));
const departmentOfferings = await batches(relevantDepartments, 2, async department => {
  const html = await get(`${api}/plainOfferings.php?COURSE_CODE=${department.code}&SEMESTER=${semester}`);
  const $ = load(html);
  return $("#poTable tbody tr").toArray().map(row => ({
    department: department.code,
    sectionCode: $(row).find("td:nth-child(1)").text().trim(),
    name: $(row).find("td:nth-child(2)").text().trim(),
    instructor: $(row).find("td:nth-child(3)").text().trim(),
  })).filter(row => row.sectionCode);
});
const allRows = departmentOfferings.flat();
const rows = allRows.filter(row => mappedCodes.has(row.sectionCode.split("-")[0].replace(/\s+/g, "").toUpperCase()));
console.log(`${allRows.length} sections found; fetching schedules for ${rows.length} mapped sections…`);

const scheduled = await batches(rows, 4, async row => {
  const html = await get(`${api}/schedule.php?COURSE=${encodeURIComponent(row.sectionCode)}&SEMESTER=${semester}`);
  const $ = load(html);
  const schedule = {};
  $("#schedule tbody td:not([align])").each((index, cell) => {
    const className = $(cell).attr("class");
    if (!className) return;
    const text = $(cell).text().trim();
    schedule[index] = className === "cl_ders_o" ? "Online" : (text || "N/A");
  });
  return { ...row, schedule };
});

const output = {};
for (const row of scheduled) {
  const [rawCourse, section] = row.sectionCode.split("-");
  const course = rawCourse.replace(/([A-Za-z]+)\s*(\d+)/, "$1 $2");
  output[row.department] ??= {};
  output[row.department][course] ??= { name: row.name, sections: {} };
  output[row.department][course].sections[section] = { instructor: row.instructor, schedule: row.schedule };
}
await mkdir(new URL("../adapters/bilkent/", import.meta.url), { recursive: true });
await writeFile(new URL("../adapters/bilkent/offerings.json", import.meta.url), JSON.stringify(output));
config.dataUpdatedAt = new Date().toISOString();
await writeFile(new URL("../adapters/bilkent/config.json", import.meta.url), `${JSON.stringify(config, null, 2)}\n`);
console.log(`Wrote ${Object.keys(output).length} departments to adapters/bilkent/offerings.json for ${semester}`);
