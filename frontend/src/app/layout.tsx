import type { Metadata } from "next";
import localFont from "next/font/local";
import { ReviewTokenProvider } from "@/components/review-token";
import "./globals.css";
import "../styles/patient.css";
import "../styles/internal.css";

// RS DHJ identity (rsuhaji.jatimprov.go.id): Montserrat, bundled locally (variable weight, Latin subset).
const montserrat = localFont({
  src: "./fonts/montserrat-latin.woff2",
  variable: "--font-montserrat",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ISLAH | Digitalisasi MCU RSUD Haji",
  description: "Layanan Medical Check Up terintegrasi RSUD Haji Provinsi Jawa Timur.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${montserrat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full"><ReviewTokenProvider>{children}</ReviewTokenProvider></body>
    </html>
  );
}
