import { redirect } from "next/navigation";
import { getServerAuthSession, resolveDashboardPath } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  redirect(resolveDashboardPath(session.user.role));
}
