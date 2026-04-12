import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: "/login",
  },
  secret: process.env.AUTH_SECRET,
  providers: [
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        });

        if (!user?.active) {
          return null;
        }

        if (user.role === Role.TECH) {
          return null;
        }

        const passwordMatches = await compare(
          parsed.data.password,
          user.passwordHash,
        );

        if (!passwordMatches) {
          return null;
        }

        return {
          asmNumber: user.asmNumber,
          email: user.email,
          id: user.id,
          name: user.name ?? user.email,
          organizationId: user.organization?.id ?? null,
          organizationName: user.organization?.name ?? null,
          organizationSlug: user.organization?.slug ?? null,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.asmNumber = user.asmNumber;
        token.organizationId = user.organizationId;
        token.organizationName = user.organizationName;
        token.organizationSlug = user.organizationSlug;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub && token.role) {
        session.user.asmNumber =
          typeof token.asmNumber === "number" ? token.asmNumber : null;
        session.user.id = token.sub;
        session.user.organizationId =
          typeof token.organizationId === "string" ? token.organizationId : null;
        session.user.organizationName =
          typeof token.organizationName === "string" ? token.organizationName : null;
        session.user.organizationSlug =
          typeof token.organizationSlug === "string" ? token.organizationSlug : null;
        session.user.role = token.role;
      }

      return session;
    },
  },
};

export async function getServerAuthSession() {
  return getServerSession(authOptions);
}

export function resolveDashboardPath(role: Role | null | undefined) {
  if (role === Role.SERVICE_SYNCNOW_ADMIN) {
    return "/servicesyncnow-admin";
  }

  if (role === Role.MANAGER) {
    return "/manager";
  }

  if (role === Role.DISPATCHER) {
    return "/dispatcher";
  }

  if (role === Role.TECH) {
    return "/login";
  }

  return "/advisor";
}

export function resolveAuthenticatedPath(input: {
  organizationId?: string | null;
  role: Role | null | undefined;
}) {
  if (input.role === Role.SERVICE_SYNCNOW_ADMIN) {
    return "/servicesyncnow-admin";
  }

  if (
    input.role &&
    input.role !== Role.TECH &&
    !input.organizationId
  ) {
    return "/org-required";
  }

  return resolveDashboardPath(input.role);
}

export async function requireSession() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireSession();

  if (!roles.includes(session.user.role)) {
    redirect(
      resolveAuthenticatedPath({
        organizationId: session.user.organizationId,
        role: session.user.role,
      }),
    );
  }

  return session;
}

export function requireOrganizationId(input: {
  user: {
    organizationId: string | null;
    role: Role;
  };
}) {
  if (!input.user.organizationId) {
    redirect("/org-required");
  }

  return input.user.organizationId;
}
