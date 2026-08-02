import type { Metadata } from "next";
import "./globals.css";
import "./term.css";
import "./export.css";
import "./modal.css";
import "./mobile-search.css";
import { activeAdapter } from "@/adapters/active";

export const metadata: Metadata = {
  title: `${activeAdapter.config.plannerTitle} Planner`,
  description: `Find approved module mappings and build a ${activeAdapter.config.shortName} timetable.`,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
