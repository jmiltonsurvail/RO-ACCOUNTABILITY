import { Role } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import {
  exchangeGoToAuthorizationCode,
  getGoToOauthRedirectUri,
  listGoToAccounts,
} from "@/lib/goto-connect";
import { prisma } from "@/lib/prisma";

function buildSettingsRedirect(status: string, message: string) {
  const url = new URL(
    "/manager/settings/integrations/goto-connect",
    "http://servicesyncnow.local",
  );
  url.searchParams.set("oauth", status);
  url.searchParams.set("message", message);
  return `${url.pathname}${url.search}${url.hash}`;
}

function buildCookieClearHeader() {
  return "goto_connect_oauth_state=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax";
}

function redirectToSettings(status: string, message: string) {
  return new Response(null, {
    headers: {
      Location: buildSettingsRedirect(status, message),
      "Set-Cookie": buildCookieClearHeader(),
    },
    status: 303,
  });
}

export async function GET(request: NextRequest) {
  const session = await getServerAuthSession();

  if (!session?.user || session.user.role !== Role.MANAGER || !session.user.organizationId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("goto_connect_oauth_state")?.value ?? null;

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToSettings("error", "GoTo OAuth state validation failed.");
  }

  const settings = await prisma.goToConnectSettings.findUnique({
    where: {
      organizationId: session.user.organizationId,
    },
    select: {
      accountKey: true,
      clientId: true,
      clientSecret: true,
      phoneNumberId: true,
    },
  });

  if (!settings?.clientId || !settings.clientSecret) {
    return redirectToSettings(
      "error",
      "GoTo Client ID and Client Secret must be saved before connecting.",
    );
  }

  try {
    const origin = process.env.NEXTAUTH_URL ?? request.nextUrl.origin;
    const redirectUri = getGoToOauthRedirectUri(origin);
    const tokens = await exchangeGoToAuthorizationCode({
      clientId: settings.clientId,
      clientSecret: settings.clientSecret,
      code,
      redirectUri,
    });

    const accountLookup = await listGoToAccounts({
      accessToken: tokens.accessToken,
    });

    let resolvedAccountKey = settings.accountKey ?? null;
    let resolvedAccountName: string | null = null;

    if (accountLookup.error) {
      throw new Error(accountLookup.error);
    }

    if (accountLookup.accounts.length === 1) {
      resolvedAccountKey = accountLookup.accounts[0]?.key ?? null;
      resolvedAccountName = accountLookup.accounts[0]?.name ?? null;
    } else if (accountLookup.accounts.length > 1) {
      if (!resolvedAccountKey) {
        await prisma.goToConnectSettings.update({
          where: {
            organizationId: session.user.organizationId,
          },
          data: {
            accessToken: tokens.accessToken,
            accessTokenExpiresAt: tokens.accessTokenExpiresAt,
            connectedAt: new Date(),
            refreshToken: tokens.refreshToken,
          },
        });
        return redirectToSettings(
          "warning",
          "GoTo connected. This token can access multiple accounts, so enter the Account Key in Advanced to finish setup.",
        );
      }

      const matchedAccount = accountLookup.accounts.find(
        (account) => account.key === resolvedAccountKey,
      );
      resolvedAccountName = matchedAccount?.name ?? null;
    }

    await prisma.goToConnectSettings.update({
      where: {
        organizationId: session.user.organizationId,
      },
      data: {
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        accountKey: resolvedAccountKey,
        accountName: resolvedAccountName,
        connectedAt: new Date(),
        refreshToken: tokens.refreshToken,
      },
    });

    return redirectToSettings("success", "GoTo connected successfully.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "GoTo OAuth failed.";
    return redirectToSettings("error", message);
  }
}
