import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      <div className="relative hidden md:block">
        <Image
          src="/peersv-team.jpg"
          alt="K. Peer SV jeugdploegen"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/85 via-slate-900/60 to-slate-900/20" />
        <div className="absolute bottom-12 left-12 text-white">
          <span className="text-5xl font-bold tracking-tight lg:text-6xl">
            K. Peer SV
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center bg-[color:var(--color-surface)] p-8 md:p-16">
        <div className="w-full max-w-sm">
          <div className="mb-6 grid size-12 place-items-center rounded-[var(--radius-md)] bg-[color:var(--color-primary)] text-xl font-bold text-white">
            P
          </div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">
            Inloggen
          </h1>
          <p className="mb-8 text-sm text-[color:var(--color-text-muted)]">
            Toegang voor admins en trainers.
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
