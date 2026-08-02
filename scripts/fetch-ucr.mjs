import { load } from "cheerio";
import { readFile, writeFile } from "node:fs/promises";

const adapterUrl = new URL("../adapters/ucr/", import.meta.url);
const configUrl = new URL("config.json", adapterUrl);
const config = JSON.parse(await readFile(configUrl, "utf8"));
const mappings = JSON.parse(await readFile(new URL("mappings.json", adapterUrl), "utf8"));
const term = process.argv[2] || config.term.code;
const base = "https://registrationssb.ucr.edu/StudentRegistrationSsb/ssb";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const normalize = code => code.replace(/\s+/g, "").toUpperCase();
const mappedCodes = new Set(mappings.flatMap(row => [row.puCourse1, row.puCourse2]).filter(Boolean).map(normalize));
const subjects = [...new Set([...mappedCodes].map(code => code.match(/^[A-Z]+/)?.[0]).filter(Boolean))];

async function request(url, options = {}, attempt = 1) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return response;
  } catch (error) {
    if (attempt >= 4) throw error;
    await pause(attempt * 2500);
    return request(url, options, attempt + 1);
  }
}

const landing = await request(`${base}/term/termSelection?mode=search`);
const cookie = landing.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
await request(`${base}/term/search?mode=search`, {
  method: "POST",
  headers: { cookie, "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ term, studyPath: "", studyPathText: "", startDatepicker: "", endDatepicker: "" }),
});

const rows = [];
for (const subject of subjects) {
  await request(`${base}/classSearch/resetDataForm`, { headers: { cookie } });
  const url = new URL(`${base}/searchResults/searchResults`);
  url.search = new URLSearchParams({ txt_subject: subject, txt_term: term, pageOffset: "0", pageMaxSize: "1000", sortColumn: "subjectDescription", sortDirection: "asc" });
  const payload = await (await request(url, { headers: { cookie } })).json();
  rows.push(...(payload.data ?? []).filter(row => mappedCodes.has(normalize(row.subjectCourse))));
  console.log(`${subject}: ${payload.totalCount ?? 0} sections checked`);
  await pause(1200);
}

const byCrn = new Map(rows.map(row => [row.courseReferenceNumber, row]));
const dayFields = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const toMinutes = raw => Number(raw.slice(0, 2)) * 60 + Number(raw.slice(2));
function meetings(row) {
  return (row.meetingsFaculty ?? []).flatMap(entry => {
    const meeting = entry.meetingTime;
    if (!meeting?.beginTime || !meeting?.endTime) return [];
    const days = dayFields.flatMap((field, index) => meeting[field] ? [index] : []);
    if (!days.length) return [];
    const location = [meeting.building, meeting.room].filter(Boolean).join(" ") || meeting.campusDescription || "TBA";
    return [{ days, startMinutes: toMinutes(meeting.beginTime), endMinutes: toMinutes(meeting.endTime), room: location, type: meeting.meetingTypeDescription }];
  });
}

async function linkedOptions(row) {
  if (!row.isSectionLinked) return [[]];
  const url = new URL(`${base}/searchResults/getLinkedSections`);
  url.search = new URLSearchParams({ term, courseReferenceNumber: row.courseReferenceNumber });
  const html = await (await request(url, { headers: { cookie } })).text();
  const $ = load(html);
  const options = [];
  $(".linkedSectionsAddAll").each((_, heading) => {
    const tbody = $(heading).closest("thead").nextAll("tbody").first();
    options.push(tbody.find("tr").map((_, tr) => $(tr).find("td").last().text().trim()).get().filter(Boolean));
  });
  await pause(800);
  return options.length ? options : [[]];
}

const output = {};
const primaryRows = rows.filter(row => Number(row.creditHours) > 0);
for (const [index, row] of primaryRows.entries()) {
  const options = await linkedOptions(row);
  const department = row.subject;
  const code = `${row.subject} ${row.courseNumber}`;
  output[department] ??= {};
  output[department][code] ??= { name: row.courseTitle, credits: Number(row.creditHours), sections: {} };
  for (const [optionIndex, linkedCrns] of options.entries()) {
    const linkedRows = linkedCrns.map(crn => byCrn.get(crn)).filter(Boolean);
    const section = options.length === 1 ? row.sequenceNumber : `${row.sequenceNumber}.${optionIndex + 1}`;
    output[department][code].sections[section] = {
      instructor: (row.faculty ?? []).map(member => member.displayName).join(", ") || "TBA",
      schedule: {},
      meetings: [row, ...linkedRows].flatMap(meetings),
    };
  }
  process.stdout.write(`\rLinked sections ${index + 1}/${primaryRows.length}`);
}
process.stdout.write("\n");

await writeFile(new URL("offerings.json", adapterUrl), `${JSON.stringify(output, null, 2)}\n`);
config.dataUpdatedAt = new Date().toISOString();
await writeFile(configUrl, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Wrote ${primaryRows.length} offered mapped course sections for UCR ${term}`);
