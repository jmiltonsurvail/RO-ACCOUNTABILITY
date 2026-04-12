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
      <section className="grid gap-5 p-4 sm:p-6">
        <div className="flex justify-end">
          <Link
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
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
