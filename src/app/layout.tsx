import type { Metadata, Viewport } from "next";
import { Readex_Pro } from "next/font/google";
import { EnvironmentBadge } from "./_components/EnvironmentBadge";
import { SWRegister } from "./sw-register";
import "./globals.css";

const readex = Readex_Pro({
  variable: "--font-readex",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PeerSV Portaal",
  description: "Portaal voor jeugdwerking PeerSV",
  applicationName: "PeerSV Portaal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "PeerSV",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${readex.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">
        <EnvironmentBadge env={process.env.APP_ENV} />
        <SWRegister />
        {children}
      </body>
    </html>
  );
}
