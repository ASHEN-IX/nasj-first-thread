import type { Metadata } from "next";
import "./platform-fonts.css";
import "./globals.css";
import "./fabric.css";
import { PortalProvider } from "@/components/PortalProvider";

export const metadata: Metadata = {
  title: "The First Thread — NASJ Early Access",
  description: "Be among the first to experience NASJ. Join The First Thread private alpha program or share your work with the NASJ artisan community.",
  icons: { icon: "/brand/nasj-mark.png" },
  applicationName: "NASJ — The First Thread",
  openGraph: { title: "NASJ — The First Thread", description: "Every meaningful connection starts with a single thread.", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><PortalProvider>{children}</PortalProvider></body></html>;
}
