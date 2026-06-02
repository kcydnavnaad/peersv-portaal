import type { Metadata, Viewport } from "next";
import { Readex_Pro } from "next/font/google";
import Link from "next/link";
import { auth } from "@/auth";
import { AdminMenu } from "./_components/AdminMenu";
import { EnvironmentBadge } from "./_components/EnvironmentBadge";
import { MobileNav } from "./_components/MobileNav";
import { UserMenu } from "./_components/UserMenu";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="nl" className={`${readex.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">
        <EnvironmentBadge env={process.env.APP_ENV} />
        <SWRegister />
        <header className="relative border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              PeerSV Portaal
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {session?.user ? (
                <>
                  {/* Desktop nav links: zichtbaar vanaf md */}
                  <div className="hidden md:flex md:items-center md:gap-4">
                    <Link href="/dashboard" className="hover:underline">
                      Dashboard
                    </Link>
                    {session.user.role === "admin" && (
                      <>
                        <Link href="/leden" className="hover:underline">
                          Leden
                        </Link>
                        <Link href="/admin/teams" className="hover:underline">
                          Teams
                        </Link>
                        <Link href="/admin/prestaties" className="hover:underline">
                          Prestaties
                        </Link>
                        <Link href="/admin/uitbetalingen" className="hover:underline">
                          Uitbetalingen
                        </Link>
                        <Link href="/admin/events" className="hover:underline">
                          Kalender
                        </Link>
                        <AdminMenu
                          label="Beheer"
                          items={[
                            { href: "/admin/users", label: "Gebruikers" },
                            { href: "/admin/instellingen", label: "Instellingen" },
                          ]}
                        />
                      </>
                    )}
                    <span className="text-slate-400">|</span>
                  </div>

                  {/* Mobile nav: alleen zichtbaar onder md */}
                  <div className="md:hidden">
                    <MobileNav
                      links={
                        session.user.role === "admin"
                          ? [
                              { href: "/dashboard", label: "Dashboard" },
                              { href: "/leden", label: "Leden" },
                              { href: "/admin/teams", label: "Teams" },
                              { href: "/admin/prestaties", label: "Prestaties" },
                              { href: "/admin/uitbetalingen", label: "Uitbetalingen" },
                              { href: "/admin/events", label: "Kalender" },
                              { separator: true, label: "Beheer" },
                              { href: "/admin/users", label: "Gebruikers" },
                              { href: "/admin/instellingen", label: "Instellingen" },
                            ]
                          : [{ href: "/dashboard", label: "Dashboard" }]
                      }
                    />
                  </div>

                  {/* UserMenu blijft op alle breedtes */}
                  <UserMenu
                    name={session.user.name ?? ""}
                    role={session.user.role ?? ""}
                  />
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
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6 md:py-8">
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