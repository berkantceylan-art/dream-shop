import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const display = Fredoka({ variable: "--nf-display", subsets: ["latin", "latin-ext"], weight: ["500", "600", "700"] });
const body = Nunito({ variable: "--nf-body", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Dream Shop",
  description: "Şehrini seç, mağazaları gez, hayalindeki hayatı kur.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
