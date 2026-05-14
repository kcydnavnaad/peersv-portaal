import { NextResponse } from "next/server";
import type { NextAuthConfig } from "next-auth";

const ADMIN_ONLY_PREFIXES = ["/admin", "/leden"];
const AUTHED_PREFIXES = ["/dashboard", "/trainer", ...ADMIN_ONLY_PREFIXES];

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;

      const needsAuth = AUTHED_PREFIXES.some((p) => pathname.startsWith(p));
      if (!needsAuth) return true;

      if (!isLoggedIn) return false;

      const adminOnly = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
      if (adminOnly && role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as "admin" | "trainer" | undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "trainer" | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
