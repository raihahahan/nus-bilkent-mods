import type { Metadata } from "next";
import "./globals.css";
import "./term.css";
import "./export.css";
import "./modal.css";
import "./mobile-search.css";
import "./dark.css";

export const metadata: Metadata = {
  title: "NUS SEP Planner",
  applicationName: "NUS SEP Planner",
  description: "Find approved NUS exchange module mappings and build a partner-university timetable.",
  openGraph: {
    title: "NUS SEP Planner",
    description: "Find approved NUS exchange module mappings and build a partner-university timetable.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "NUS SEP Planner",
    description: "Find approved NUS exchange module mappings and build a partner-university timetable.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
