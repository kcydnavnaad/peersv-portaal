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
    <div className="relative min-h-screen overflow-hidden">
      <Image
        src="/peersv-team.jpg"
        alt="K. Peer SV jeugdploegen"
        fill
        priority
        className="absolute inset-0 z-0 object-cover"
      />

      <div className="absolute inset-0 z-10 bg-gradient-to-b from-slate-900/50 to-slate-50/95 md:bg-gradient-to-r md:from-slate-900/85 md:via-slate-900/60 md:to-slate-50/95" />

      <span className="absolute bottom-8 left-6 z-20 hidden text-4xl font-bold tracking-tight text-white md:block md:bottom-12 md:left-12 md:text-5xl lg:text-6xl">
        K. Peer SV
      </span>

      <div className="relative z-20 flex min-h-screen items-center justify-center p-8 md:justify-end md:p-16 lg:pr-24">
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-[color:var(--color-surface)] p-8 shadow-[var(--shadow-md)]">
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
