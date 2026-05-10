import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, Allura, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BackendStatus } from "@/components/BackendStatus";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-fraunces",
});

const allura = Allura({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-allura",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Vespers",
  description:
    "Vespers is a calm, premium emotional wellness companion for stress, anxiety, sadness, and the tangled days. Anonymous by design — no account, no inbox. Take a slow breath. There's a quiet place.",
  applicationName: "Vespers",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${allura.variable} ${mono.variable}`}
    >
      <body className="font-sans antialiased">
        {children}
        <BackendStatus />
      </body>
    </html>
  );
}
