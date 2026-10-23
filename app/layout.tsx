import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
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

/*
  Code face. A THIRD family, not a reuse of either of the two above.

  Apercu Mono is a labelling face: it sets the caps mono labels and carries the
  site's character. It was never drawn to be read as code, and at snippet size
  its wide, even letterforms make `display:none` look like a design element
  rather than like something you could paste into a stylesheet.

  JetBrains Mono is drawn for exactly that job: a slashed zero, `1 l I` cut to
  be told apart, and brackets spaced to stay countable when nested. On Google
  Fonts, so next/font self-hosts it the same way it does Geist.

  Latin only, weight 400 only. A code snippet is never bold or italic here, and
  every extra weight is another file a visitor downloads.
*/
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-brand-code",
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
    <html lang="en" className={`${geist.variable} ${apercuMono.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full">
        {/* Sidebar renders its own fixed left RAIL (desktop) + TOP BAR (mobile).
            It sits outside the content flow, so the content column just needs a
            left offset on desktop (md:pl-60) to clear the 240px rail. The © and
            connect links now live in the rail, so no separate footer. */}
        <Sidebar />
        <div className="md:pl-60">
          {/* Generous canvas; each page constrains its own content width as
              needed (info/work use their own max-w; archive uses the room
              for its contact-sheet grid). */}
          <main className="mx-auto w-full max-w-6xl px-6 py-14 md:px-10 md:py-20">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
