export type PartnerConfig = {
  id: string;
  name: string;
  shortName: string;
  plannerTitle: string;
  mark: string;
  term: { code: string; label: string };
  partnerCreditsLabel: string;
  partnerCreditUnit: string;
  courseUrlTemplate: string;
  offeringsSource: string;
  dataUpdatedAt: string;
  importantDocumentUrl: string;
  importantDocumentLabel: string;
  storageKey: string;
  exportSlug: string;
  repositoryUrl: string;
};

export function partnerCourseUrl(partner: PartnerConfig, courseCode: string) {
  const match = courseCode.match(/^([A-Z]+)\s*(\d+)/i);
  if (!match) return partner.offeringsSource;
  const department = match[1].toUpperCase();
  const normalizedCode = `${department} ${match[2]}`;
  return partner.courseUrlTemplate
    .replace("{department}", encodeURIComponent(department))
    .replace("{number}", encodeURIComponent(match[2]))
    .replace("{code}", encodeURIComponent(normalizedCode));
}
