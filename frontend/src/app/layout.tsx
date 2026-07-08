import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "LUCY LMS Studio",
  description: "CEFR-aligned LMS and live room frontend for LUCY."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="lucy-grid-bg min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
