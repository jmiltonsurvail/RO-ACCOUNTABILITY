ALTER TYPE "Role" ADD VALUE 'TECH';

ALTER TABLE "User"
ADD COLUMN "techNumber" INTEGER;

CREATE UNIQUE INDEX "User_role_asmNumber_key" ON "User"("role", "asmNumber");
CREATE UNIQUE INDEX "User_role_techNumber_key" ON "User"("role", "techNumber");
