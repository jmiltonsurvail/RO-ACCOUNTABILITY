import { randomUUID } from "node:crypto";
import { Role } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import {
  buildGoToOauthAuthorizeUrl,
  getGoToOauthRedirectUri,
} from "@/lib/goto-connect";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user || session.user.role !== Role.MANAGER || !session.user.organizationId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const settings = await prisma.goToConnectSettings.findUnique({
    where: {
      organizationId: session.user.organizationId,
    },
    select: {
      clientId: true,
    },
  });

  if (!settings?.clientId) {
    return NextResponse.redirect(
      new URL(
        "/manager/settings/integrations/goto-connect?oauth=missing-client",
        request.url,
      ),
    );
  }

  const state = randomUUID();
  const origin = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;
  const redirectUri = getGoToOauthRedirectUri(origin);
  const authorizationUrl = buildGoToOauthAuthorizeUrl({
    clientId: settings.clientId,
    redirectUri,
    state,
  });

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set("goto_connect_oauth_state", state, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}
