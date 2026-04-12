import { Role } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import {
  exchangeGoToAuthorizationCode,
  getGoToOauthRedirectUri,
  listGoToAccounts,
} from "@/lib/goto-connect";
import { prisma } from "@/lib/prisma";

function buildSettingsRedirect(request: NextRequest, status: string, message: string) {
  const url = new URL("/manager/settings/integrations/goto-connect", request.url);
  url.searchParams.set("oauth", status);
  url.searchParams.set("message", message);
  return url;
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
    const response = NextResponse.redirect(
      buildSettingsRedirect(request, "error", "GoTo OAuth state validation failed."),
    );
    response.cookies.delete("goto_connect_oauth_state");
    return response;
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
    const response = NextResponse.redirect(
      buildSettingsRedirect(
        request,
        "error",
        "GoTo Client ID and Client Secret must be saved before connecting.",
      ),
    );
    response.cookies.delete("goto_connect_oauth_state");
    return response;
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
        const response = NextResponse.redirect(
          buildSettingsRedirect(
            request,
            "warning",
            "GoTo connected. This token can access multiple accounts, so enter the Account Key in Advanced to finish setup.",
          ),
        );
        response.cookies.delete("goto_connect_oauth_state");
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
        return response;
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

    const response = NextResponse.redirect(
      buildSettingsRedirect(request, "success", "GoTo connected successfully."),
    );
    response.cookies.delete("goto_connect_oauth_state");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "GoTo OAuth failed.";
    const response = NextResponse.redirect(buildSettingsRedirect(request, "error", message));
    response.cookies.delete("goto_connect_oauth_state");
    return response;
  }
}
