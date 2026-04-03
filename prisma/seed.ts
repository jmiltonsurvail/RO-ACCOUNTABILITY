import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_MANAGER_EMAIL ?? "manager@example.com";
  const password = process.env.SEED_MANAGER_PASSWORD ?? "ChangeMe123!";
  const name = process.env.SEED_MANAGER_NAME ?? "Initial Manager";

  const passwordHash = await hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      active: true,
      name,
      passwordHash,
      role: Role.MANAGER,
    },
    create: {
      active: true,
      email,
      name,
      passwordHash,
      role: Role.MANAGER,
    },
  });
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
