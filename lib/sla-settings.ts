import { prisma } from "@/lib/prisma";

export const defaultSlaSettings = {
  blockedAgingHours: 8,
  contactSlaHours: 2,
  dueSoonHours: 12,
} as const;

export type SlaSettingsValues = typeof defaultSlaSettings;

export async function getSlaSettings(): Promise<SlaSettingsValues> {
  const settings = await prisma.slaSettings.findUnique({
    where: { id: "default" },
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
