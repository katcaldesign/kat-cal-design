import type { Metadata } from "next";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import Header from "./components/Header";

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
      <body className="flex min-h-full flex-col">
        {/* Header is fixed to the top, so it sits OUTSIDE the normal flow… */}
        <Header />
        {/* …which means the page content needs top padding (pt-28) to clear it. */}
        <main className="mx-auto w-full max-w-5xl grow px-6 pt-28 pb-24">{children}</main>
        <footer className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-8">
            <span className="kat-mono-xs uppercase tracking-wider text-ink-light">
              © {new Date().getFullYear()} kat calvert
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
