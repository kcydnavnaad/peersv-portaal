import type { Metadata } from "next";
import { Readex_Pro } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const readex = Readex_Pro({
  variable: "--font-readex",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PeerSV Portaal",
  description: "Ledenadministratie voor PeerSV",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${readex.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              PeerSV Portaal
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="hover:underline">
                Dashboard
              </Link>
              <Link href="/leden" className="hover:underline">
                Leden
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-4 text-xs text-slate-500">
            PeerSV ledenadministratie
          </div>
        </footer>
      </body>
    </html>
  );
}
