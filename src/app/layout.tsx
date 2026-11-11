import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Edu Gestion — Plateforme scolaire",
  description:
    "Edu Gestion : pilotez élèves, absences, notes, familles et finances dans une seule plateforme.",
  icons: { icon: "/edu-gestion-mark.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${dmSans.variable} ${fraunces.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased">
        <Script id="density-boot" strategy="beforeInteractive">{`(function(){try{var d=localStorage.getItem("edugestion:density");if(d==="compact")document.documentElement.dataset.density="compact";else document.documentElement.dataset.density="comfortable";}catch(e){}})();`}</Script>
        {children}
      </body>
    </html>
  );
}
