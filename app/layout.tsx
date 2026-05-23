import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import OrientationLock from "./OrientationLock";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ÜWA Autoservicio",
  description: "Sistema de autoservicio ÜWA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "ÜWA",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/icon-192.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#10B557",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="orientation-booting min-h-full flex flex-col">
        <OrientationLock />
        {children}
      </body>
    </html>
  );
}





