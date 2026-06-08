import type { DefaultSession } from "next-auth";

type UserRole = "admin" | "trainer";

declare module "next-auth" {
  interface User {
    role?: UserRole;
    isAlsoTrainer?: boolean;
  }
  interface Session {
    user: {
      id: string;
      role?: UserRole;
      isAlsoTrainer?: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    isAlsoTrainer?: boolean;
  }
}
