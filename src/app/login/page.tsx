import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto mt-12 max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight">Inloggen</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Toegang voor admins en trainers.
      </p>
      <LoginForm />
      <p className="mt-4 text-center text-sm">
        <Link href="/forgot-password" className="text-slate-600 hover:underline">
          Wachtwoord vergeten?
        </Link>
      </p>
    </div>
  );
}
