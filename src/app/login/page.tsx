import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="grid min-h-[calc(100vh-8rem)] place-items-center px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 shadow-[var(--shadow-md)]">
        <div className="mb-6 flex flex-col items-center">
          <div className="grid size-12 place-items-center rounded-[var(--radius-md)] bg-[color:var(--color-primary)] text-white text-xl font-bold">
            P
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Inloggen
          </h1>
          <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
            Toegang voor admins en trainers.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
