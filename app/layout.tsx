import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The First Thread — NASJ Early Access",
  description: "Be among the first to experience NASJ. Join The First Thread private alpha program or share your work with the NASJ artisan community.",
  applicationName: "NASJ — The First Thread",
  openGraph: { title: "NASJ — The First Thread", description: "Every meaningful connection starts with a single thread.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
