import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();
  const role = session?.user?.role;

  if (role === "admin") redirect("/admin");
  if (role === "trainer") redirect("/trainer");
  redirect("/login");
}
