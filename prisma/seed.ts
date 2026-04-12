import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const orgName = process.env.SEED_ORG_NAME ?? "Default Organization";
  const orgSlug = process.env.SEED_ORG_SLUG ?? "default-org";
  const email = process.env.SEED_MANAGER_EMAIL ?? "manager@example.com";
  const password = process.env.SEED_MANAGER_PASSWORD ?? "ChangeMe123!";
  const name = process.env.SEED_MANAGER_NAME ?? "Initial Manager";
  const platformAdminEmail = process.env.SEED_PLATFORM_ADMIN_EMAIL;
  const platformAdminPassword = process.env.SEED_PLATFORM_ADMIN_PASSWORD;
  const platformAdminName =
    process.env.SEED_PLATFORM_ADMIN_NAME ?? "ServiceSyncNow Admin";

  const passwordHash = await hash(password, 12);
  const organization = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: {
      active: true,
      name: orgName,
    },
    create: {
      active: true,
      name: orgName,
      slug: orgSlug,
    },
  });

  await prisma.user.upsert({
    where: { email },
    update: {
      active: true,
      organizationId: organization.id,
      name,
      passwordHash,
      role: Role.MANAGER,
    },
    create: {
      active: true,
      email,
      name,
      organizationId: organization.id,
      passwordHash,
      role: Role.MANAGER,
    },
  });

  if (platformAdminEmail && platformAdminPassword) {
    const platformAdminPasswordHash = await hash(platformAdminPassword, 12);

    await prisma.user.upsert({
      where: { email: platformAdminEmail },
      update: {
        active: true,
        name: platformAdminName,
        organizationId: null,
        passwordHash: platformAdminPasswordHash,
        role: Role.SERVICE_SYNCNOW_ADMIN,
      },
      create: {
        active: true,
        email: platformAdminEmail,
        name: platformAdminName,
        organizationId: null,
        passwordHash: platformAdminPasswordHash,
        role: Role.SERVICE_SYNCNOW_ADMIN,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
