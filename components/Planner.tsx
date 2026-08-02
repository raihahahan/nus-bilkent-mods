"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { partnerCourseUrl, type PartnerConfig } from "@/lib/partner";

type Mapping = {
  faculty: string;
  puCourse1: string; puCourse1Title: string; puCrse1Units: number;
  puCourse2: string; puCourse2Title: string; puCrse2Units: number;
  nusCourse1: string; nusCourse1Title: string; nusCrse1Units: number;
  nusCourse2: string; nusCourse2Title: string; nusCrse2Units: number;
};
type Meeting = { days: number[]; startMinutes: number; endMinutes: number; room: string; type?: string };
type MeetingBlock = { day: number; startMinutes: number; endMinutes: number; room: string; type?: string };
type Section = { instructor: string; schedule: Record<string, string>; meetings?: Meeting[] };
type Course = { name: string; credits?: number; sections: Record<string, Section> };
type Offerings = Record<string, Record<string, Course>>;
type FlatCourse = Course & { code: string };
type Selected = { id: string; code: string; name: string; credits?: number; section: string; sectionData: Section };
type PlannerAdapter = { config: PartnerConfig; mappings: Mapping[]; offerings: Record<string, Offerings> };

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = Array.from({ length: 14 }, (_, i) => `${String(i + 8).padStart(2, "0")}:30`);
const palette = ["#3d64f4", "#dc5c3f", "#099779", "#8a55cc", "#c28205", "#277b9b"];
const alternativePalette = [
  { border: "#3158e8", background: "#dfe6ffcc", text: "#2645ad" },
  { border: "#d14f32", background: "#ffe4ddcc", text: "#9f321c" },
  { border: "#07866c", background: "#d9f3ebcc", text: "#056b57" },
  { border: "#7d4cc1", background: "#eadffdCC", text: "#60349e" },
  { border: "#b47700", background: "#fff0cacc", text: "#815600" },
];
const pageSize = 12;
const faculties = [
  ["All", "All faculties"],
  ["School of Computing", "Computing"],
  ["Faculty of Science", "Science"],
  ["College of Design and Engineering", "Engineering & Design"],
  ["Faculty of Arts & Social Sciences", "Arts & Social Sciences"],
  ["NUS Business School", "Business"],
] as const;

function normalize(code: string) { return code.replace(/\s+/g, "").toUpperCase(); }
function dataTimestamp(isoDate: string, useBrowserTimezone: boolean) {
  if (!useBrowserTimezone) return `${isoDate.slice(0, 10)} ${isoDate.slice(11, 16)} UTC`;
  const date = new Date(isoDate);
  const pad = (value: number) => String(value).padStart(2, "0");
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
  const remainingMinutes = Math.abs(offsetMinutes) % 60;
  const offset = offsetMinutes === 0 ? "UTC" : `UTC${offsetMinutes > 0 ? "+" : "-"}${offsetHours}${remainingMinutes ? `:${pad(remainingMinutes)}` : ""}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())} ${offset}`;
}
function slots(section: Section) {
  return Object.entries(section.schedule).map(([raw, room]) => {
    const index = Number(raw);
    return { day: index % 7, hour: Math.floor(index / 7), room };
  });
}
function formatMinutes(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
function meetingBlocks(section: Section): MeetingBlock[] {
  if (section.meetings) return section.meetings.flatMap(meeting => meeting.days.map(day => ({ day, startMinutes: meeting.startMinutes, endMinutes: meeting.endMinutes, room: meeting.room, type: meeting.type })));
  const ordered = slots(section).filter(slot => slot.day < 5 && slot.hour < 12)
    .map(slot => ({ day: slot.day, startMinutes: 510 + slot.hour * 60, endMinutes: 560 + slot.hour * 60, room: slot.room }))
    .sort((a, b) => a.day - b.day || a.startMinutes - b.startMinutes);
  return ordered.reduce<{ day: number; startMinutes: number; endMinutes: number; room: string }[]>((blocks, slot) => {
    const previous = blocks[blocks.length - 1];
    if (previous && previous.day === slot.day && previous.room === slot.room && slot.startMinutes - previous.endMinutes <= 10) {
      previous.endMinutes = slot.endMinutes;
    } else {
      blocks.push(slot);
    }
    return blocks;
  }, []);
}

export default function Planner({ adapters }: { adapters: PlannerAdapter[] }) {
  const [partnerId, setPartnerId] = useState(adapters[0].config.id);
  const [partnerChoiceHydrated, setPartnerChoiceHydrated] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const savedTheme = localStorage.getItem("nus-sep-theme");
    const nextTheme = savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);
  useEffect(() => {
    const savedPartner = localStorage.getItem("nus-exchange-selected-partner");
    if (savedPartner && adapters.some(item => item.config.id === savedPartner)) setPartnerId(savedPartner);
    setPartnerChoiceHydrated(true);
  }, [adapters]);
  useEffect(() => {
    if (partnerChoiceHydrated) localStorage.setItem("nus-exchange-selected-partner", partnerId);
  }, [partnerChoiceHydrated, partnerId]);
  const adapter = adapters.find(item => item.config.id === partnerId) ?? adapters[0];
  function toggleTheme() {
    setTheme(current => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem("nus-sep-theme", next);
      document.documentElement.dataset.theme = next;
      return next;
    });
  }
  return <PlannerWorkspace key={adapter.config.id} partner={adapter.config} mappings={adapter.mappings} offerings={adapter.offerings}
    adapterOptions={adapters.map(item => item.config)} onPartnerChange={setPartnerId} theme={theme} onToggleTheme={toggleTheme} />;
}

function PlannerWorkspace({ partner, mappings, offerings, adapterOptions, onPartnerChange, theme, onToggleTheme }: { partner: PartnerConfig; mappings: Mapping[]; offerings: Record<string, Offerings>; adapterOptions: PartnerConfig[]; onPartnerChange: (id: string) => void; theme: "light" | "dark"; onToggleTheme: () => void }) {
  const term = partner.term.code;
  const timelineColumns = (partner.timetable.endMinutes - partner.timetable.startMinutes) / 10;
  const timelineHalfHours = (partner.timetable.endMinutes - partner.timetable.startMinutes) / 30;
  const firstLabel = Math.ceil((partner.timetable.startMinutes - partner.timetable.labelMinute) / 60) * 60 + partner.timetable.labelMinute;
  const timelineLabels = Array.from({ length: Math.ceil((partner.timetable.endMinutes - firstLabel) / 60) }, (_, index) => firstLabel + index * 60);
  const [query, setQuery] = useState("");
  const [faculty, setFaculty] = useState("All");
  const [offeredOnly, setOfferedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [sidebarWidth, setSidebarWidth] = useState(370);
  const [selected, setSelected] = useState<Selected[]>([]);
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [exporting, setExporting] = useState<"jpg" | "pdf" | null>(null);
  const [showAdapterHelp, setShowAdapterHelp] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const currentCourses = new Map(Object.values(offerings[term] ?? {}).flatMap(department =>
      Object.entries(department).map(([code, course]) => [normalize(code), { code, ...course }] as const)));
    const restoreSelected = (value: unknown) => {
      if (!Array.isArray(value)) return;
      const restored = value.flatMap(item => {
        if (!item || typeof item !== "object") return [];
        const savedItem = item as Partial<Selected>;
        if (typeof savedItem.code !== "string" || typeof savedItem.section !== "string") return [];
        const course = currentCourses.get(normalize(savedItem.code));
        const sectionData = course?.sections[savedItem.section];
        if (!course || !sectionData) return [];
        return [{ ...savedItem, id: `${course.code}-${savedItem.section}`, code: course.code, name: course.name, credits: course.credits, sectionData } as Selected];
      });
      setSelected(restored);
    };
    const saved = localStorage.getItem(partner.storageKey);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (typeof state.query === "string") setQuery(state.query);
        const savedFaculty = state.faculty ?? state.school;
        if (typeof savedFaculty === "string" && faculties.some(([value]) => value === savedFaculty)) setFaculty(savedFaculty);
        if (typeof state.offeredOnly === "boolean") setOfferedOnly(state.offeredOnly);
        if (typeof state.sidebarWidth === "number") setSidebarWidth(Math.min(500, Math.max(320, state.sidebarWidth)));
        restoreSelected(state.selected);
      } catch {}
    } else if (partner.id === "bilkent") {
      const legacyPlan = localStorage.getItem("nus-bilkent-plan");
      if (legacyPlan) { try { restoreSelected(JSON.parse(legacyPlan)); } catch {} }
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(partner.storageKey, JSON.stringify({ query, faculty, offeredOnly, selected, sidebarWidth }));
  }, [faculty, hydrated, offeredOnly, partner.storageKey, query, selected, sidebarWidth]);

  useEffect(() => { setPage(1); }, [faculty, offeredOnly, query]);
  useEffect(() => {
    if (!mobileSearchOpen) return;
    mobileSearchRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileSearchOpen]);
  useEffect(() => {
    if (previewCode && !selected.some(item => item.code === previewCode)) setPreviewCode(null);
  }, [previewCode, selected]);

  const courses = useMemo(() => Object.values(offerings[term]).flatMap(dept =>
    Object.entries(dept).map(([code, course]) => ({ code, ...course }))), [offerings, term]);
  const courseByCode = useMemo(() => new Map(courses.map(c => [normalize(c.code), c])), [courses]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const normalizedQuery = normalize(q);
    const isOffered = (m: Mapping) => [m.puCourse1, m.puCourse2].filter(Boolean).every(code => courseByCode.has(normalize(code)));
    let results = mappings.filter(m => faculty === "All" || m.faculty === faculty);
    if (q) results = results.filter(m => {
      const codes = [m.nusCourse1, m.nusCourse2, m.puCourse1, m.puCourse2];
      if (codes.some(code => normalize(String(code)).includes(normalizedQuery))) return true;

      // Short department searches such as "CS" should only match module codes;
      // otherwise they also match unrelated title endings such as "genetics".
      if (normalizedQuery.length < 3) return false;
      const titles = [m.nusCourse1Title, m.nusCourse2Title, m.puCourse1Title, m.puCourse2Title];
      return titles.some(title => String(title).toLowerCase().includes(q));
    });
    if (offeredOnly) results = results.filter(isOffered);
    results = results.map((mapping, index) => ({ mapping, index, offered: isOffered(mapping) }))
      .sort((a, b) => Number(b.offered) - Number(a.offered) || a.index - b.index)
      .map(({ mapping }) => mapping);
    return results;
  }, [courseByCode, faculty, mappings, offeredOnly, query]);
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  const visibleMatches = matches.slice((page - 1) * pageSize, page * pageSize);

  function addCourse(course: FlatCourse, section: string) {
    const id = `${course.code}-${section}`;
    const item = { id, code: course.code, name: course.name, credits: course.credits, section, sectionData: course.sections[section] };
    setSelected(prev => prev.some(x => x.id === id)
      ? prev.filter(x => x.id !== id)
      : [...prev.filter(x => x.code !== course.code), item]);
  }
  function hasConflict(candidate: Section, ignoreCode = "") {
    const used = selected.filter(x => x.code !== ignoreCode).flatMap(x => meetingBlocks(x.sectionData));
    return meetingBlocks(candidate).some(block => used.some(other => block.day === other.day && block.startMinutes < other.endMinutes && other.startMinutes < block.endMinutes));
  }

  async function exportTimetable(format: "jpg" | "pdf") {
    if (!exportRef.current || exporting) return;
    setExporting(format);
    try {
      exportRef.current.classList.add("isExporting");
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        width: exportRef.current.scrollWidth,
        height: exportRef.current.scrollHeight,
        windowWidth: exportRef.current.scrollWidth,
      });
      const filename = `${partner.exportSlug}-${partner.term.code}`;
      if (format === "jpg") {
        const link = document.createElement("a");
        link.download = `${filename}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 0.94);
        link.click();
      } else {
        const { jsPDF } = await import("jspdf");
        const margin = 8;
        const pageWidth = canvas.width >= canvas.height ? 297 : 210;
        const imageWidth = pageWidth - margin * 2;
        const imageHeight = imageWidth * (canvas.height / canvas.width);
        const pageHeight = imageHeight + margin * 2;
        const pdf = new jsPDF({ orientation: pageWidth >= pageHeight ? "landscape" : "portrait", unit: "mm", format: [pageWidth, pageHeight] });
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.94), "JPEG", margin, margin, imageWidth, imageHeight);
        pdf.save(`${filename}.pdf`);
      }
    } finally {
      exportRef.current?.classList.remove("isExporting");
      setExporting(null);
    }
  }

  const adapterPrompt = `Extend this Next.js exchange timetable planner for another NUS partner university.

Repository setup:
1. Fork the repository, then clone your fork:
   git clone ${partner.repositoryUrl}.git
2. Read adapters/README.md and use adapters/bilkent as the reference implementation.

Choose one outcome:
- contribute the adapter to the shared university dropdown by opening a pull request; or
- keep and deploy your own independent fork.

Target university: <UNIVERSITY NAME>
Target academic term: <TERM>

Please:
- create adapters/<university-id>/config.json without hard-coding university labels in the shared UI;
- extract that university's approved mappings from the NUS mapping dataset into the existing normalized mapping schema;
- investigate its official public course/section/timetable source and implement a respectful, rate-limited fetcher;
- normalize offerings into department > course > sections > instructor/schedule;
- provide reliable partner course-detail links and credit labels;
- register the adapter in adapters/index.ts so it appears in the university dropdown;
- preserve search, faculty filtering, availability ordering, pagination, conflict detection, local saving, JPG/PDF export and mobile layout;
- document how to refresh the data and clearly report any data that cannot be fetched publicly;
- run the production build and fix all errors.

Do not invent offerings or meeting times. Prefer official sources and keep partner-specific parsing inside the adapter.`;

  async function copyAdapterPrompt() {
    await navigator.clipboard.writeText(adapterPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const totalNus = selected.reduce((sum, item) => {
    const m = mappings.find(x => [x.puCourse1, x.puCourse2].some(code => normalize(code) === normalize(item.code)));
    return sum + (m ? m.nusCrse1Units + m.nusCrse2Units : 0);
  }, 0);
  const totalPartnerCredits = selected.reduce((sum, item) => {
    const m = mappings.find(x => [x.puCourse1, x.puCourse2].some(code => normalize(code) === normalize(item.code)));
    return sum + (item.credits ?? (m ? (normalize(m.puCourse1) === normalize(item.code) ? m.puCrse1Units : m.puCrse2Units) : 0));
  }, 0);
  const timetableGroups = useMemo(() => {
    const blocks: ({ item: Selected; colorIndex: number } & MeetingBlock)[] = [];
    selected.forEach((item, colorIndex) => meetingBlocks(item.sectionData).filter(block => block.day < 5).forEach(block => {
      blocks.push({ item, colorIndex, ...block });
    }));
    const groups: { key: string; day: number; startMinutes: number; endMinutes: number; laneCount: number; entries: ((typeof blocks)[number] & { lane: number })[] }[] = [];
    for (const day of days.slice(0, 5).keys()) {
      const dayBlocks = blocks.filter(block => block.day === day).sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
      let cluster: typeof dayBlocks = [];
      let clusterEnd = -1;
      const finishCluster = () => {
        if (!cluster.length) return;
        const laneEnds: number[] = [];
        const entries = cluster.map(block => {
          let lane = laneEnds.findIndex(end => end <= block.startMinutes);
          if (lane < 0) lane = laneEnds.length;
          laneEnds[lane] = block.endMinutes;
          return { ...block, lane };
        });
        groups.push({ key: `${day}-${cluster[0].startMinutes}-${clusterEnd}`, day, startMinutes: cluster[0].startMinutes, endMinutes: clusterEnd, laneCount: laneEnds.length, entries });
      };
      dayBlocks.forEach(block => {
        if (cluster.length && block.startMinutes >= clusterEnd) {
          finishCluster();
          cluster = [];
          clusterEnd = -1;
        }
        cluster.push(block);
        clusterEnd = Math.max(clusterEnd, block.endMinutes);
      });
      finishCluster();
    }
    return groups;
  }, [selected]);
  const unscheduledSelected = selected.filter(item => meetingBlocks(item.sectionData).length === 0);
  const previewGroups = useMemo(() => {
    if (!previewCode) return [];
    const selectedCourse = selected.find(item => item.code === previewCode);
    const course = courseByCode.get(normalize(previewCode));
    if (!selectedCourse || !course) return [];
    const groups = new Map<string, ({ section: string; colorIndex: number } & MeetingBlock)[]>();
    Object.entries(course.sections).filter(([section]) => section !== selectedCourse.section).forEach(([section, sectionData], colorIndex) => {
      meetingBlocks(sectionData).filter(block => block.day < 5).forEach(block => {
        const key = `${block.day}-${block.startMinutes}-${block.endMinutes}`;
        const group = groups.get(key) ?? [];
        group.push({ section, colorIndex, ...block });
        groups.set(key, group);
      });
    });
    return [...groups.entries()];
  }, [courseByCode, previewCode, selected]);

  function choosePreviewSection(section: string) {
    if (!previewCode) return;
    const course = courseByCode.get(normalize(previewCode));
    if (!course?.sections[section]) return;
    addCourse(course, section);
    setPreviewCode(null);
  }

  return <main>
    <header className="topbar">
      <div className="brandControls"><span className="mark"><img src="/icon.svg" alt="" /></span><select className="partnerSelect" aria-label="Exchange university" value={partner.id} onChange={event => onPartnerChange(event.target.value)}>{adapterOptions.map(option => <option value={option.id} key={option.id}>{option.plannerTitle}</option>)}</select><button className="addPartnerButton" aria-label="Map another university" title="Map another university" onClick={() => setShowAdapterHelp(true)}>＋</button><span className="muted">NUS SEP Module Planner</span><button className="themeToggle" onClick={onToggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? "☀" : "☾"}</button><a className="githubLink" href={partner.repositoryUrl} target="_blank" rel="noreferrer" aria-label="View project on GitHub" title="View project on GitHub"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.23c-3.24.7-3.92-1.38-3.92-1.38-.53-1.35-1.29-1.71-1.29-1.71-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.41-1.27.74-1.56-2.58-.29-5.3-1.29-5.3-5.69 0-1.26.45-2.29 1.2-3.09-.12-.29-.52-1.48.11-3.05 0 0 .98-.31 3.16 1.18a10.9 10.9 0 0 1 5.76 0c2.18-1.49 3.16-1.18 3.16-1.18.63 1.57.23 2.76.11 3.05.75.8 1.2 1.83 1.2 3.09 0 4.41-2.72 5.4-5.31 5.69.42.36.79 1.07.79 2.17v3.24c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .7Z"/></svg></a></div>
      <div className="headerRight"><div className="totals"><span><b>{selected.length}</b> modules</span><span><b>{totalNus}</b> NUS MCs</span><span><b>{totalPartnerCredits}</b> {partner.partnerCreditsLabel}</span></div></div>
    </header>
    <div className="mobileTotals"><span><b>{totalNus}</b> NUS MCs</span><span><b>{totalPartnerCredits}</b> {partner.partnerCreditsLabel}</span></div>

    <div className="workspace" style={{ gridTemplateColumns: `${sidebarWidth}px 6px minmax(700px, 1fr)` }}>
      <aside>
        <div className="asideHead">
          <div className="desktopFilters">
            <label>{partner.shortName} term</label>
            <div className="termBadge"><span>{partner.term.label}</span><small>Semester {partner.term.code}</small></div>
            <label className="schoolLabel" htmlFor="faculty">NUS faculty</label>
            <select id="faculty" className="schoolFilter" suppressHydrationWarning value={faculty} onChange={e => setFaculty(e.target.value)}>
              {faculties.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label className="offeredFilter"><input type="checkbox" checked={offeredOnly} onChange={e => setOfferedOnly(e.target.checked)} /><span>Offered this term only</span></label>
          </div>
          <div className="search"><span>⌕</span><input suppressHydrationWarning value={query} onChange={e => setQuery(e.target.value)} placeholder="Search CS2040, CS 201, algorithms…" /></div>
          <p className="hint">Search by either NUS or {partner.shortName} code/title.</p>
        </div>
        <div className={`results ${query.trim() ? "mobileSearchActive" : ""}`}>
          <div className="resultMeta"><span>{matches.length} mapping{matches.length === 1 ? "" : "s"}</span>{matches.length > pageSize && <span>Page {page} of {pageCount}</span>}</div>
          {visibleMatches.map((m, i) => <MappingCard key={`${m.nusCourse1}-${m.puCourse1}-${i}`} partner={partner} mapping={m} courseByCode={courseByCode} addCourse={addCourse} hasConflict={hasConflict} selected={selected} />)}
          {!matches.length && <div className="emptySmall">No modules match the current filters.</div>}
          {pageCount > 1 && <div className="pagination"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</button><span>{page} / {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>Next →</button></div>}
        </div>
      </aside>
      <div className="resizeHandle" role="separator" aria-label="Resize module sidebar" aria-orientation="vertical" aria-valuemin={320} aria-valuemax={500} aria-valuenow={sidebarWidth} tabIndex={0}
        onPointerDown={e => e.currentTarget.setPointerCapture(e.pointerId)}
        onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) setSidebarWidth(Math.min(500, Math.max(320, e.clientX))); }}
        onPointerUp={e => e.currentTarget.releasePointerCapture(e.pointerId)}
        onKeyDown={e => { if (e.key === "ArrowLeft") setSidebarWidth(w => Math.max(320, w - 10)); if (e.key === "ArrowRight") setSidebarWidth(w => Math.min(500, w + 10)); }} />

      <section className="planner">
        <div className="plannerHead"><div><h1>Your timetable</h1><p>Choose a section from the search results. Conflicts are flagged before you add.</p><div className="plannerResources"><a href={partner.importantDocumentUrl} target="_blank" rel="noreferrer">{partner.importantDocumentLabel} ↗</a><a href={partner.partnerPortalUrl} target="_blank" rel="noreferrer">{partner.partnerPortalLabel} ↗</a><span>Data last updated <time dateTime={partner.dataUpdatedAt} title={`${partner.dataUpdatedAt.slice(0, 16).replace("T", " ")} UTC`}>{dataTimestamp(partner.dataUpdatedAt, hydrated)}</time></span></div></div><div className="plannerActions"><button className="exportButton" disabled={!!exporting} onClick={() => exportTimetable("jpg")}>{exporting === "jpg" ? "Exporting…" : "Export JPG"}</button><button className="exportButton primary" disabled={!!exporting} onClick={() => exportTimetable("pdf")}>{exporting === "pdf" ? "Exporting…" : "Export PDF"}</button>{selected.length > 0 && <button className="clear" onClick={() => setSelected([])}>Clear all</button>}</div></div>
        <div className="exportSheet" ref={exportRef}>
        <div className="exportTitle"><b>{partner.plannerTitle} timetable</b><div className="exportMeta"><span>{partner.term.label} · Semester {partner.term.code}</span><strong>{totalNus} NUS MCs · {totalPartnerCredits} {partner.partnerCreditsLabel}</strong></div></div>
        {unscheduledSelected.length > 0 && <div className="unscheduledNotice"><b>Time not published</b><span>{unscheduledSelected.map(item => `${item.code} · Section ${item.section}`).join(" · ")}</span><small>These modules are selected, but {partner.shortName} has not published meeting times yet, so they cannot be placed or clash-checked.</small></div>}
        <div className="timetableWrap"><div className="timetable daysAsRows" style={{ gridTemplateColumns: `72px repeat(${timelineColumns}, minmax(15px, 1fr))`, minWidth: `${72 + timelineColumns * 15}px` }}>
          <div className="corner"><span>Day</span><small>Class time</small></div>{timelineLabels.map(label => <div className={`timeHeader ${label === partner.timetable.startMinutes ? "atTimelineStart" : ""}`} key={label} style={{ gridColumn: `${Math.round((label - partner.timetable.startMinutes) / 10) + 2} / span 1` }}><b>{formatMinutes(label).replace(":", "")}</b></div>)}
          {days.slice(0, 5).map((day, d) => <div className="dayRow" key={day} style={{ gridRow: d + 2, gridTemplateColumns: `72px repeat(${timelineHalfHours}, minmax(45px, 1fr))` }}><div className="dayLabel">{day}</div>{Array.from({ length: timelineHalfHours }, (_, index) => <div className="cell" key={index} />)}</div>)}
          {previewGroups.map(([key, group]) => <div key={`preview-${key}`} className="ghostStack" style={{ gridColumn: `${Math.round((group[0].startMinutes - partner.timetable.startMinutes) / 10) + 2} / span ${Math.max(1, Math.round((group[0].endMinutes - group[0].startMinutes) / 10))}`, gridRow: group[0].day + 2 }}>
            {group.map(({ section, colorIndex, room, startMinutes, endMinutes }) => { const color = alternativePalette[colorIndex % alternativePalette.length]; return <button type="button" className="ghostEvent" key={`${section}-${room}`} onClick={() => choosePreviewSection(section)} style={{ borderColor: color.border, background: color.background, color: color.text }} title={`Switch ${previewCode} to Section ${section}`}><b>{previewCode}</b><small>Sec {section} · {room}</small><small>{formatMinutes(startMinutes)}–{formatMinutes(endMinutes)}</small></button>; })}
          </div>)}
          {timetableGroups.map(group => <div key={group.key} className={`eventStack ${group.laneCount > 1 ? "clash" : ""}`} style={{ gridColumn: `${Math.round((group.startMinutes - partner.timetable.startMinutes) / 10) + 2} / span ${Math.max(1, Math.round((group.endMinutes - group.startMinutes) / 10))}`, gridRow: group.day + 2 }}>
            {group.entries.map(({ item, colorIndex, room, startMinutes, endMinutes, lane }) => { const clashes = group.entries.filter(other => other.item.id !== item.id && startMinutes < other.endMinutes && other.startMinutes < endMinutes); return <button key={`${item.id}-${startMinutes}-${endMinutes}`} className={`event ${previewCode === item.code ? "previewing" : ""}`} onClick={() => setPreviewCode(code => code === item.code ? null : item.code)}
              style={{ background: palette[colorIndex % palette.length], left: `${((startMinutes - group.startMinutes) / (group.endMinutes - group.startMinutes)) * 100}%`, width: `${((endMinutes - startMinutes) / (group.endMinutes - group.startMinutes)) * 100}%`, top: `calc(${(lane / group.laneCount) * 100}% + 2px)`, height: `calc(${100 / group.laneCount}% - 4px)` }} title={`${clashes.length ? `Clashes with ${clashes.map(x => x.item.code).join(", ")} · ` : ""}${previewCode === item.code ? "Click to hide alternative sections" : "Click to preview alternative sections"}`}>
              <b>{item.code}</b><small>Sec {item.section} · {room}</small><small>{formatMinutes(startMinutes)}–{formatMinutes(endMinutes)}</small>
            </button>; })}
          </div>)}
        </div></div>
        {selected.length === 0 ? <div className="blank"><span>＋</span><h2>Build your {partner.shortName} week</h2><p>Search a NUS module to find its approved mapping, then pick a {partner.shortName} section.</p></div> :
          <div className="chosen">{selected.map((item, i) => { const itemMappings = mappings.filter(mapping => [mapping.puCourse1, mapping.puCourse2].some(code => normalize(code) === normalize(item.code))); const itemMapping = itemMappings[0]; const nusCodes = [...new Set(itemMappings.flatMap(mapping => [mapping.nusCourse1, mapping.nusCourse2]).filter(Boolean))]; const nusCredits = itemMapping ? itemMapping.nusCrse1Units + itemMapping.nusCrse2Units : 0; const partnerCredits = item.credits ?? (itemMapping ? (normalize(itemMapping.puCourse1) === normalize(item.code) ? itemMapping.puCrse1Units : itemMapping.puCrse2Units) : 0); return <div key={item.id} className="chosenItem"><i style={{ background: palette[i % palette.length] }} /><div className="chosenContent"><b>{item.code} · Section {item.section}</b><span>{item.name} · {item.sectionData.instructor}</span><span className="exportCredits">{nusCredits} NUS MCs · {partnerCredits} {partner.partnerCreditUnit}</span><div className="chosenLinks">{nusCodes.map(code => <a key={code} href={`https://nusmods.com/courses/${code}`} target="_blank" rel="noreferrer">NUSMods · {code} ↗</a>)}<a href={partnerCourseUrl(partner, item.code)} target="_blank" rel="noreferrer">{partner.shortName} · {item.code} ↗</a></div></div><button aria-label={`Remove ${item.code}`} onClick={() => setSelected(p => p.filter(x => x.id !== item.id))}>×</button></div>; })}</div>}
        </div>
      </section>
    </div>
    <button className="mobileSearchTrigger" onClick={() => setMobileSearchOpen(true)}><span>＋</span>Add module to timetable</button>
    {mobileSearchOpen && <section className="mobileSearchOverlay" aria-label="Search modules"><div className="mobileSearchHeader"><div className="mobileSearchInput"><span>⌕</span><input ref={mobileSearchRef} suppressHydrationWarning value={query} onChange={e => setQuery(e.target.value)} placeholder="Add module to timetable" /></div><button aria-label="Close module search" onClick={() => setMobileSearchOpen(false)}>×</button></div><div className="mobileSearchBody">{!query.trim() ? <div className="mobileSearchHelp"><b>Search all {mappings.length} approved mappings</b><span>Try an NUS or {partner.shortName} module code, or a module title.</span><small>For example: “CS4243”, “CS 484” or “Computer Vision”</small></div> : <><div className="resultMeta"><span>{matches.length} mapping{matches.length === 1 ? "" : "s"}</span>{matches.length > pageSize && <span>Page {page} of {pageCount}</span>}</div>{visibleMatches.map((m, i) => <MappingCard key={`mobile-${m.nusCourse1}-${m.puCourse1}-${i}`} partner={partner} mapping={m} courseByCode={courseByCode} addCourse={(course, section) => { addCourse(course, section); setMobileSearchOpen(false); }} hasConflict={hasConflict} selected={selected} />)}{!matches.length && <div className="emptySmall">No modules match your search.</div>}{pageCount > 1 && <div className="pagination"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</button><span>{page} / {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage(p => p + 1)}>Next →</button></div>}</>}</div></section>}
    {showAdapterHelp && <div className="modalBackdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setShowAdapterHelp(false); }}><section className="adapterModal" role="dialog" aria-modal="true" aria-labelledby="adapter-title"><button className="modalClose" aria-label="Close" onClick={() => setShowAdapterHelp(false)}>×</button><span className="modalEyebrow">Open-source adapters</span><h2 id="adapter-title">Map another university</h2><p>Add a code-level adapter. No database is required. Contribute it to this planner’s dropdown with a pull request, or maintain and deploy your own fork.</p><ol><li><b>Fork and clone</b><span>Fork the repository on GitHub and clone your fork locally.</span><code>git clone {partner.repositoryUrl}.git</code></li><li><b>Copy the reference adapter</b><span>Duplicate <code>adapters/bilkent</code>, then update its name, term, links, document and credit labels.</span></li><li><b>Connect official data</b><span>Filter the NUS mapping dataset and translate the university’s public offerings into the documented course/section format.</span></li><li><b>Register and verify</b><span>Add it to <code>adapters/index.ts</code>, test the dropdown, links and conflicts, then open a PR. You can also keep the fork as your own deployment.</span><a className="issueLink" href={`${partner.repositoryUrl}/issues`} target="_blank" rel="noreferrer">Open an issue before your PR ↗</a></li></ol><div className="promptBox"><div className="promptHeader"><div><b>Let your favourite AI handle the implementation</b><span>Review the full prompt below, then copy it into your preferred AI tool.</span></div><button onClick={copyAdapterPrompt}>{copied ? "Copied!" : "Copy AI prompt"}</button></div><pre><code>{adapterPrompt}</code></pre></div><span className="adapterDocs">Full schema and checklist: adapters/README.md</span></section></div>}
  </main>;
}

function MappingCard({ partner, mapping: m, courseByCode, addCourse, hasConflict, selected }: { partner: PartnerConfig; mapping: Mapping; courseByCode: Map<string, FlatCourse>; addCourse: (c: FlatCourse, s: string) => void; hasConflict: (s: Section, code?: string) => boolean; selected: Selected[] }) {
  const partnerCodes = [m.puCourse1, m.puCourse2].filter(Boolean);
  const availableCourses = partnerCodes.map(code => courseByCode.get(normalize(code))).filter((course): course is FlatCourse => Boolean(course));
  const cardSelected = availableCourses.some(course => selected.some(item => item.code === course.code));
  const toggleCard = () => {
    if (cardSelected) {
      availableCourses.forEach(course => { const selectedCourse = selected.find(item => item.code === course.code); if (selectedCourse) addCourse(course, selectedCourse.section); });
      return;
    }
    availableCourses.forEach(course => { const defaultSection = course.sections["1"] ? "1" : Object.keys(course.sections)[0]; if (defaultSection) addCourse(course, defaultSection); });
  };
  return <article className={`mappingCard ${availableCourses.length ? "clickableCard" : ""} ${cardSelected ? "selectedCard" : ""}`} tabIndex={availableCourses.length ? 0 : undefined}
    aria-label={availableCourses.length ? `${cardSelected ? "Remove" : "Add"} ${m.puCourse1}${cardSelected ? "" : " with its default section"}` : undefined}
    onClick={availableCourses.length ? toggleCard : undefined}
    onKeyDown={availableCourses.length ? e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCard(); } } : undefined}>
    <div className="mappingTop"><div className="mappingStatus"><span className="approved">Approved mapping</span>{cardSelected && <span className="selectedIndicator">Selected</span>}</div><span>{m.faculty.replace("College of Design and Engineering", "CDE")}</span></div>
    <div className="pair">
      <Module side="NUS" code={m.nusCourse1} title={m.nusCourse1Title} credits={m.nusCrse1Units} href={`https://nusmods.com/courses/${m.nusCourse1}`} />
      <span className="arrow">↔</span>
      <Module side={partner.shortName} code={m.puCourse1} title={m.puCourse1Title} credits={courseByCode.get(normalize(m.puCourse1))?.credits ?? m.puCrse1Units} creditUnit={partner.partnerCreditUnit} href={partnerCourseUrl(partner, m.puCourse1)} />
    </div>
    {(m.nusCourse2 || m.puCourse2) && <div className="secondary">Also: {m.nusCourse2 || "None"} ↔ {m.puCourse2 || "None"}</div>}
    {partnerCodes.map(code => { const course = courseByCode.get(normalize(code)); return course ? <Sections key={code} course={course} addCourse={addCourse} hasConflict={hasConflict} selected={selected} /> : <p className="unavailable" key={code}>{code} is not offered this term</p>; })}
  </article>;
}
function Module({ side, code, title, credits, href, creditUnit }: { side: string; code: string; title: string; credits: number; href: string; creditUnit?: string }) {
  return <div className="module"><small>{side}</small><a href={href} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{code} ↗</a><span>{title}</span>{credits > 0 && <em>{credits} {side === "NUS" ? "MCs" : creditUnit}</em>}</div>;
}
function Sections({ course, addCourse, hasConflict, selected }: { course: FlatCourse; addCourse: (c: FlatCourse, s: string) => void; hasConflict: (s: Section, code?: string) => boolean; selected: Selected[] }) {
  return <div className="sections"><span className="sectionsLabel">Sections<small>Tap card for Section 1, or choose</small></span>{Object.entries(course.sections).map(([number, section]) => { const active = selected.some(x => x.code === course.code && x.section === number); const conflict = hasConflict(section, course.code); const blocks = meetingBlocks(section); return <button key={number} className={active ? "active" : conflict ? "conflict" : blocks.length === 0 ? "tba" : ""} onClick={e => { e.stopPropagation(); addCourse(course, number); }} title={blocks.length === 0 ? `${section.instructor} · Schedule TBA` : `${conflict ? "Conflict · " : ""}${section.instructor} · ${blocks.map(block => `${days[block.day]} ${formatMinutes(block.startMinutes)}–${formatMinutes(block.endMinutes)}`).join(", ")}`}><b>{number}</b></button>; })}</div>;
}
