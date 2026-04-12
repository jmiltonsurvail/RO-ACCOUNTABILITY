import { prisma } from "@/lib/prisma";

export type SlaSettingsValues = {
  blockedAgingHours: number;
  contactSlaHours: number;
  dueSoonHours: number;
};

export const defaultSlaSettings: SlaSettingsValues = {
  blockedAgingHours: 8,
  contactSlaHours: 2,
  dueSoonHours: 12,
};

export async function getSlaSettings(organizationId?: string | null): Promise<SlaSettingsValues> {
  if (!organizationId) {
    return defaultSlaSettings;
  }

  const settings = await prisma.slaSettings.findUnique({
    where: { organizationId },
  });

  if (!settings) {
    return defaultSlaSettings;
  }

  return {
    blockedAgingHours: settings.blockedAgingHours,
    contactSlaHours: settings.contactSlaHours,
    dueSoonHours: settings.dueSoonHours,
  };
}
