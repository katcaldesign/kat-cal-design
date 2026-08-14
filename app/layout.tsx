import type { Metadata } from "next";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Sidebar from "./components/Sidebar";

/*
  FONTS — next/font self-hosts these, prevents layout shift, and hands us a CSS
  variable that our design tokens (in globals.css) point at.
*/
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-brand-sans",
  display: "swap",
});

const apercuMono = localFont({
  src: [
    { path: "./fonts/ApercuMonoPro-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/ApercuMonoPro-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ApercuMonoPro-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ApercuMonoPro-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-brand-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "kat calvert",
  description: "Systems-focused product designer — portfolio & archive.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${apercuMono.variable} h-full`}>
      <body className="min-h-full">
        {/* Sidebar renders its own fixed left RAIL (desktop) + TOP BAR (mobile).
            It sits outside the content flow, so the content column just needs a
            left offset on desktop (md:pl-60) to clear the 240px rail. The © and
            connect links now live in the rail, so no separate footer. */}
        <Sidebar />
        <div className="md:pl-60">
          <main className="mx-auto w-full max-w-4xl px-6 py-14 md:px-10 md:py-20">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
