import Link from "next/link";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/app-shell";
import { PlatformIntegrationsForm } from "@/components/platform-integrations-form";
import { requireRole } from "@/lib/auth";
import { getPlatformIntegrationSettings } from "@/lib/platform-integrations";

export default async function ServiceSyncNowAdminIntegrationsPage() {
  const session = await requireRole([Role.SERVICE_SYNCNOW_ADMIN]);
  const settings = await getPlatformIntegrationSettings();

  return (
    <AppShell
      currentPath="/servicesyncnow-admin/integrations"
      session={session}
      subtitle=""
      title="Platform Integrations"
    >
      <section className="grid gap-5">
        <div className="flex justify-end">
          <Link
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:border-zinc-900 hover:bg-zinc-50"
            href="/servicesyncnow-admin"
          >
            Back to Organizations
          </Link>
        </div>

        <PlatformIntegrationsForm settings={settings} />
      </section>
    </AppShell>
  );
}
