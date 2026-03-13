import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      asmNumber: number | null;
      role: Role;
    };
  }

  interface User {
    asmNumber: number | null;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    asmNumber?: number | null;
    role?: Role;
  }
}
