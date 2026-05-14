import type { Metadata } from "next";
import { Readex_Pro } from "next/font/google";
import Link from "next/link";
import { auth } from "@/auth";
import { logout } from "@/app/actions/auth";
import "./globals.css";

const readex = Readex_Pro({
  variable: "--font-readex",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PeerSV Portaal",
  description: "Ledenadministratie voor PeerSV",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="nl" className={`${readex.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              PeerSV Portaal
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {session?.user ? (
                <>
                  <Link href="/dashboard" className="hover:underline">
                    Dashboard
                  </Link>
                  {session.user.role === "admin" && (
                    <>
                      <Link href="/leden" className="hover:underline">
                        Leden
                      </Link>
                      <Link
                        href="/admin/teams"
                        className="hover:underline"
                      >
                        Teams
                      </Link>
                      <Link
                        href="/admin/trainers"
                        className="hover:underline"
                      >
                        Trainers
                      </Link>
                      <Link
                        href="/admin/prestaties"
                        className="hover:underline"
                      >
                        Prestaties
                      </Link>
                    </>
                  )}
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600">
                    {session.user.name}
                    <span className="ml-1 text-xs text-slate-400">
                      ({session.user.role})
                    </span>
                  </span>
                  <form action={logout}>
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
                    >
                      Uitloggen
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800"
                >
                  Inloggen
                </Link>
              )}
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
