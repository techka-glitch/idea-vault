import type { Metadata, Viewport } from "next";
import { Playfair_Display, Montserrat, Caveat } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-playfair" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-montserrat" });
const caveat = Caveat({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-caveat" });

export const metadata: Metadata = {
  title: "Idea Vault",
  description: "Personal ideas, projects and lists.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#EB518F" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${montserrat.variable} ${caveat.variable}`}>
      <body className="bg-cream text-ink antialiased overflow-x-hidden">
        <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
