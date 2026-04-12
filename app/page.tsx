import { redirect } from "next/navigation";
import { getServerAuthSession, resolveAuthenticatedPath } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  redirect(
    resolveAuthenticatedPath({
      organizationId: session.user.organizationId,
      role: session.user.role,
    }),
  );
}
