import { prisma } from "@/lib/prisma";
import { formatPhoneHref } from "@/lib/utils";

export type GoToConnectSettingsValues = {
  accountKey: string | null;
  accountName: string | null;
  accessToken: string | null;
  accessTokenExpiresAt: string | null;
  autoAnswer: boolean;
  callEventsConfiguredAt: string | null;
  callEventsReportSubscriptionId: string | null;
  clientId: string | null;
  clientSecret: string | null;
  connectedAt: string | null;
  enabled: boolean;
  launchUrlTemplate: string | null;
  notificationChannelId: string | null;
  notificationWebhookToken: string | null;
  organizationId: string | null;
  phoneNumberId: string | null;
  refreshToken: string | null;
};

export const defaultGoToConnectSettings: GoToConnectSettingsValues = {
  accountKey: null,
  accountName: null,
  accessToken: null,
  accessTokenExpiresAt: null,
  autoAnswer: false,
  callEventsConfiguredAt: null,
  callEventsReportSubscriptionId: null,
  clientId: null,
  clientSecret: null,
  connectedAt: null,
  enabled: false,
  launchUrlTemplate: null,
  notificationChannelId: null,
  notificationWebhookToken: null,
  organizationId: null,
  phoneNumberId: null,
  refreshToken: null,
};

export async function getGoToConnectSettings(
  organizationId?: string | null,
): Promise<GoToConnectSettingsValues> {
  if (!organizationId) {
    return defaultGoToConnectSettings;
  }

  const settings = await prisma.goToConnectSettings.findUnique({
    where: { organizationId },
  });

  if (!settings) {
    return defaultGoToConnectSettings;
  }

  return {
    accountKey: settings.accountKey,
    accountName: settings.accountName,
    accessToken: settings.accessToken,
    accessTokenExpiresAt: settings.accessTokenExpiresAt?.toISOString() ?? null,
    autoAnswer: settings.autoAnswer,
    callEventsConfiguredAt: settings.callEventsConfiguredAt?.toISOString() ?? null,
    callEventsReportSubscriptionId: settings.callEventsReportSubscriptionId,
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    connectedAt: settings.connectedAt?.toISOString() ?? null,
    enabled: settings.enabled,
    launchUrlTemplate: settings.launchUrlTemplate,
    notificationChannelId: settings.notificationChannelId,
    notificationWebhookToken: settings.notificationWebhookToken,
    organizationId: settings.goToOrganizationId,
    phoneNumberId: settings.phoneNumberId,
    refreshToken: settings.refreshToken,
  };
}

type GoToUsersResponse = {
  items?: Array<{
    lines?: Array<{
      id?: string;
      name?: string;
      number?: string;
    }>;
    userKey?: string;
  }>;
};

type GoToApiErrorResponse = {
  constraintViolations?: Array<{
    description?: string;
    field?: string;
  }>;
  description?: string;
  errorCode?: string;
  message?: string;
};

export type GoToConnectionTestResult = {
  lineCount: number;
  matchedLineId: string | null;
  matchedLineName: string | null;
  message: string;
  ok: boolean;
  testedExtension: string | null;
  userCount: number;
};

export type GoToCallEventsReport = {
  accountKey?: string;
  callCreated?: string;
  callEnded?: string;
  callStates?: Array<{
    type?: string;
  }>;
  conversationSpaceId?: string;
  direction?: string;
  participants?: Array<unknown>;
};

export type ResolvedGoToLine = {
  lineId: string;
  lineName: string | null;
  number: string;
};

export type GoToAccountSummary = {
  key: string;
  name: string | null;
};

function normalizeExtension(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function fetchGoToUsers(input: {
  accessToken: string | null;
  accountKey: string | null;
}) {
  if (!input.accessToken || !input.accountKey) {
    return {
      error: "Account Key and Access Token are required.",
      payload: null,
      response: null,
    };
  }

  const response = await fetch(
    `https://api.goto.com/users/v1/users?accountKey=${encodeURIComponent(input.accountKey)}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.accessToken}`,
      },
      method: "GET",
    },
  );

  if (!response.ok) {
    return {
      error: `GoTo lookup failed with status ${response.status}.`,
      payload: null,
      response,
    };
  }

  return {
    error: null,
    payload: (await response.json()) as GoToUsersResponse,
    response,
  };
}

async function fetchGoToAccounts(input: {
  accessToken: string | null;
}) {
  if (!input.accessToken) {
    return {
      error: "Access Token is required.",
      payload: null,
    };
  }

  const response = await fetch("https://api.getgo.com/admin/rest/v1/me", {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    method: "GET",
  });

  if (!response.ok) {
    return {
      error: `GoTo account lookup failed with status ${response.status}.`,
      payload: null,
    };
  }

  const payload = (await response.json()) as {
    accounts?: Array<{
      key?: string;
      name?: string;
    }>;
  };

  return {
    error: null,
    payload: (payload.accounts ?? [])
      .filter((account): account is { key: string; name?: string } => Boolean(account.key))
      .map((account) => ({
        key: account.key,
        name: account.name ?? null,
      })),
  };
}

export async function listGoToAccounts(input: {
  accessToken: string | null;
}) {
  const result = await fetchGoToAccounts(input);

  if (result.error || !result.payload) {
    return {
      accounts: [] as GoToAccountSummary[],
      error: result.error ?? "Unable to load GoTo accounts.",
    };
  }

  return {
    accounts: result.payload,
    error: null,
  };
}

export async function resolveGoToAccount(input: {
  accessToken: string | null;
  accountKey?: string | null;
}) {
  const providedAccountKey = input.accountKey?.trim() || null;

  if (providedAccountKey) {
    return {
      account: {
        key: providedAccountKey,
        name: null,
      },
      error: null,
    };
  }

  const result = await fetchGoToAccounts({
    accessToken: input.accessToken,
  });

  if (result.error || !result.payload) {
    return {
      account: null,
      error: result.error ?? "Unable to discover the GoTo account.",
    };
  }

  if (result.payload.length === 0) {
    return {
      account: null,
      error: "No GoTo Connect accounts were found for this token.",
    };
  }

  if (result.payload.length > 1) {
    return {
      account: null,
      error:
        "This token can access multiple GoTo accounts. Open Advanced and enter the Account Key manually.",
    };
  }

  return {
    account: result.payload[0] ?? null,
    error: null,
  };
}

export function getGoToOauthRedirectUri(origin: string) {
  return `${origin.replace(/\/+$/, "")}/api/goto-connect/oauth/callback`;
}

export function getGoToNotificationWebhookUrl(input: {
  origin: string;
  webhookToken: string;
}) {
  const url = new URL(
    `${input.origin.replace(/\/+$/, "")}/api/goto-connect/notifications`,
  );
  url.searchParams.set("token", input.webhookToken);
  return url.toString();
}

export function buildGoToOauthAuthorizeUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL("https://authentication.logmeininc.com/oauth/authorize");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", input.state);
  return url.toString();
}

async function exchangeGoToToken(input: {
  clientId: string;
  clientSecret: string;
  code?: string;
  redirectUri?: string;
  refreshToken?: string;
}) {
  const body = new URLSearchParams();

  if (input.code) {
    body.set("code", input.code);
    body.set("grant_type", "authorization_code");
  } else if (input.refreshToken) {
    body.set("grant_type", "refresh_token");
    body.set("refresh_token", input.refreshToken);
  } else {
    throw new Error("OAuth code or refresh token is required.");
  }

  if (input.redirectUri) {
    body.set("redirect_uri", input.redirectUri);
  }

  const authHeader = Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64");
  const response = await fetch("https://authentication.logmeininc.com/oauth/token", {
    body,
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`GoTo token exchange failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };

  if (!payload.access_token) {
    throw new Error("GoTo token exchange did not return an access token.");
  }

  return {
    accessToken: payload.access_token,
    accessTokenExpiresAt:
      typeof payload.expires_in === "number"
        ? new Date(Date.now() + payload.expires_in * 1000)
        : null,
    refreshToken: payload.refresh_token ?? null,
  };
}

export async function exchangeGoToAuthorizationCode(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}) {
  return exchangeGoToToken(input);
}

export async function refreshGoToAccessToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}) {
  return exchangeGoToToken(input);
}

function shouldRefreshGoToToken(expiresAt: Date | null) {
  if (!expiresAt) {
    return false;
  }

  return expiresAt.getTime() <= Date.now() + 60_000;
}

export async function getGoToConnectSettingsWithAccessToken(
  organizationId: string,
): Promise<GoToConnectSettingsValues> {
  const settings = await prisma.goToConnectSettings.findUnique({
    where: { organizationId },
  });

  if (!settings) {
    return defaultGoToConnectSettings;
  }

  if (
    settings.refreshToken &&
    settings.clientId &&
    settings.clientSecret &&
    shouldRefreshGoToToken(settings.accessTokenExpiresAt)
  ) {
    try {
      const refreshed = await refreshGoToAccessToken({
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
        refreshToken: settings.refreshToken,
      });

      const updated = await prisma.goToConnectSettings.update({
        where: { organizationId },
        data: {
          accessToken: refreshed.accessToken,
          accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
          connectedAt: new Date(),
          refreshToken: refreshed.refreshToken ?? settings.refreshToken,
        },
      });

      return {
        accountKey: updated.accountKey,
        accountName: updated.accountName,
        accessToken: updated.accessToken,
        accessTokenExpiresAt: updated.accessTokenExpiresAt?.toISOString() ?? null,
        autoAnswer: updated.autoAnswer,
        callEventsConfiguredAt: updated.callEventsConfiguredAt?.toISOString() ?? null,
        callEventsReportSubscriptionId: updated.callEventsReportSubscriptionId,
        clientId: updated.clientId,
        clientSecret: updated.clientSecret,
        connectedAt: updated.connectedAt?.toISOString() ?? null,
        enabled: updated.enabled,
        launchUrlTemplate: updated.launchUrlTemplate,
        notificationChannelId: updated.notificationChannelId,
        notificationWebhookToken: updated.notificationWebhookToken,
        organizationId: updated.goToOrganizationId,
        phoneNumberId: updated.phoneNumberId,
        refreshToken: updated.refreshToken,
      };
    } catch {
      return getGoToConnectSettings(organizationId);
    }
  }

  return getGoToConnectSettings(organizationId);
}

function buildGoToLineMap(payload: GoToUsersResponse) {
  const lineMap = new Map<string, ResolvedGoToLine>();

  for (const user of payload.items ?? []) {
    for (const line of user.lines ?? []) {
      const normalizedNumber = normalizeExtension(line.number);

      if (!normalizedNumber || !line.id) {
        continue;
      }

      lineMap.set(normalizedNumber, {
        lineId: line.id,
        lineName: line.name ?? null,
        number: line.number ?? normalizedNumber,
      });
    }
  }

  return lineMap;
}

function getDialString(phone: string | null | undefined) {
  const href = formatPhoneHref(phone);

  if (!href) {
    return null;
  }

  return href.replace(/^tel:/, "");
}

function applyTemplate(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) =>
    encodeURIComponent(values[key] ?? ""),
  );
}

export function buildGoToConnectLaunchUrl(input: {
  asmExtension: string | null;
  asmNumber: number;
  customerName: string;
  phone: string | null;
  roNumber: number;
  settings: GoToConnectSettingsValues;
}) {
  if (
    !input.settings.enabled ||
    !input.settings.launchUrlTemplate ||
    !input.asmExtension
  ) {
    return null;
  }

  const dialString = getDialString(input.phone);

  if (!dialString) {
    return null;
  }

  return applyTemplate(input.settings.launchUrlTemplate, {
    asm_extension: input.asmExtension,
    asm_number: String(input.asmNumber),
    customer_name: input.customerName,
    customer_phone: dialString,
    organization_id: input.settings.organizationId ?? "",
    ro_number: String(input.roNumber),
  });
}

export function getGoToClickToCallPayload(input: {
  dialString: string | null;
  lineId: string | null;
  settings: GoToConnectSettingsValues;
}) {
  if (!input.settings.enabled || !input.settings.accessToken || !input.lineId || !input.dialString) {
    return null;
  }

  return {
    autoAnswer: input.settings.autoAnswer,
    dialString: input.dialString,
    from: {
      lineId: input.lineId,
    },
    ...(input.settings.phoneNumberId
      ? {
          phoneNumberId: input.settings.phoneNumberId,
        }
      : {}),
  };
}

export function normalizePhoneForGoToDialString(phone: string | null | undefined) {
  return getDialString(phone);
}

export async function resolveGoToLineByExtension(input: {
  accessToken: string | null;
  accountKey: string | null;
  extension: string | null;
}) {
  const extension = normalizeExtension(input.extension);

  if (!input.accessToken || !input.accountKey || !extension) {
    return null;
  }

  const result = await fetchGoToUsers({
    accessToken: input.accessToken,
    accountKey: input.accountKey,
  });

  if (result.error || !result.payload) {
    return null;
  }

  return buildGoToLineMap(result.payload).get(extension) ?? null;
}

export async function resolveGoToLinesByExtensions(input: {
  accessToken: string | null;
  accountKey: string | null;
  extensions: Array<string | null | undefined>;
}) {
  const normalizedExtensions = input.extensions
    .map((extension) => normalizeExtension(extension))
    .filter((extension): extension is string => Boolean(extension));

  if (
    normalizedExtensions.length === 0 ||
    !input.accessToken ||
    !input.accountKey
  ) {
    return new Map<string, ResolvedGoToLine>();
  }

  const result = await fetchGoToUsers({
    accessToken: input.accessToken,
    accountKey: input.accountKey,
  });

  if (result.error || !result.payload) {
    return new Map<string, ResolvedGoToLine>();
  }

  const lineMap = buildGoToLineMap(result.payload);

  return new Map(
    normalizedExtensions
      .map((extension) => {
        const line = lineMap.get(extension);
        return line ? [extension, line] : null;
      })
      .filter((entry): entry is [string, ResolvedGoToLine] => Boolean(entry)),
  );
}

export async function testGoToConnection(input: {
  accessToken: string | null;
  accountKey?: string | null;
  extension?: string | null;
}): Promise<GoToConnectionTestResult> {
  const testedExtension = normalizeExtension(input.extension);
  const resolvedAccount = await resolveGoToAccount({
    accessToken: input.accessToken,
    accountKey: input.accountKey ?? null,
  });

  if (resolvedAccount.error || !resolvedAccount.account) {
    return {
      lineCount: 0,
      matchedLineId: null,
      matchedLineName: null,
      message: resolvedAccount.error ?? "Unable to discover the GoTo account.",
      ok: false,
      testedExtension,
      userCount: 0,
    };
  }

  const result = await fetchGoToUsers({
    accessToken: input.accessToken,
    accountKey: resolvedAccount.account.key,
  });

  if (result.error || !result.payload) {
    return {
      lineCount: 0,
      matchedLineId: null,
      matchedLineName: null,
      message: result.error ?? "Unable to contact GoTo Connect.",
      ok: false,
      testedExtension,
      userCount: 0,
    };
  }

  const users = result.payload.items ?? [];
  let lineCount = 0;

  for (const user of users) {
    lineCount += user.lines?.length ?? 0;
  }

  if (!testedExtension) {
    return {
      lineCount,
      matchedLineId: null,
      matchedLineName: null,
      message: `Connected to GoTo Connect. Using account ${resolvedAccount.account.key}. Found ${users.length} users and ${lineCount} lines.`,
      ok: true,
      testedExtension: null,
      userCount: users.length,
    };
  }

  const resolvedLine = await resolveGoToLineByExtension({
    accessToken: input.accessToken,
    accountKey: resolvedAccount.account.key,
    extension: testedExtension,
  });

  if (!resolvedLine) {
    return {
      lineCount,
      matchedLineId: null,
      matchedLineName: null,
      message: `Connected to GoTo Connect using account ${resolvedAccount.account.key}, but extension ${testedExtension} did not resolve to a line.`,
      ok: false,
      testedExtension,
      userCount: users.length,
    };
  }

  return {
      lineCount,
      matchedLineId: resolvedLine.lineId,
      matchedLineName: resolvedLine.lineName,
      message: `Connected to GoTo Connect using account ${resolvedAccount.account.key} and resolved extension ${testedExtension} to line ${resolvedLine.lineId}.`,
      ok: true,
      testedExtension,
      userCount: users.length,
  };
}

export async function getGoToCallFailureMessage(response: Response) {
  let payload: GoToApiErrorResponse | null = null;

  try {
    payload = (await response.json()) as GoToApiErrorResponse;
  } catch {
    payload = null;
  }

  const constraintMessage = payload?.constraintViolations
    ?.map((violation) => {
      if (violation.field && violation.description) {
        return `${violation.field}: ${violation.description}`;
      }

      return violation.description ?? violation.field ?? null;
    })
    .filter((value): value is string => Boolean(value))
    .join("; ");

  if (response.status === 401) {
    return "GoTo Connect rejected the access token. Check the token and try again.";
  }

  if (response.status === 403) {
    return "GoTo Connect denied the call request. The token likely does not include the required scopes.";
  }

  if (response.status === 404) {
    return "GoTo Connect could not find the selected ASM line. Re-resolve the advisor extension in settings.";
  }

  if (response.status === 429) {
    return "GoTo Connect rate-limited the request. Try the call again in a moment.";
  }

  if (constraintMessage) {
    return `GoTo Connect rejected the call request: ${constraintMessage}`;
  }

  if (payload?.description) {
    return payload.description;
  }

  if (payload?.message) {
    return payload.message;
  }

  if (payload?.errorCode) {
    return `GoTo Connect returned ${payload.errorCode}.`;
  }

  return `GoTo Connect call request failed with status ${response.status}.`;
}

export async function createGoToNotificationChannel(input: {
  accessToken: string;
  webhookUrl: string;
  channelNickname: string;
}) {
  const response = await fetch(
    `https://api.goto.com/notification-channel/v1/channels/${encodeURIComponent(input.channelNickname)}`,
    {
      body: JSON.stringify({
        channelType: "Webhook",
        webhookChannelData: {
          webhook: {
            url: input.webhookUrl,
          },
        },
      }),
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(`GoTo notification channel creation failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    channelId?: string;
  };

  if (!payload.channelId) {
    throw new Error("GoTo notification channel creation did not return a channel id.");
  }

  return payload.channelId;
}

export async function subscribeToGoToCallEvents(input: {
  accessToken: string;
  accountKey: string;
  channelId: string;
}) {
  const response = await fetch("https://api.goto.com/call-events/v1/subscriptions", {
    body: JSON.stringify({
      accountKeys: [
        {
          events: ["STARTING", "CONNECTED", "ENDING"],
          id: input.accountKey,
        },
      ],
      channelId: input.channelId,
    }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`GoTo call events subscription failed with status ${response.status}.`);
  }
}

export async function subscribeToGoToCallEventReports(input: {
  accessToken: string;
  accountKey: string;
  channelId: string;
}) {
  const response = await fetch("https://api.goto.com/call-events-report/v1/subscriptions", {
    body: JSON.stringify({
      accountKeys: [input.accountKey],
      channelId: input.channelId,
      eventTypes: ["REPORT_SUMMARY"],
    }),
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(
      `GoTo call events report subscription failed with status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as {
    items?: Array<{
      id?: string;
    }>;
  };

  const subscriptionId = payload.items?.[0]?.id;

  if (!subscriptionId) {
    throw new Error("GoTo call events report subscription did not return an id.");
  }

  return subscriptionId;
}

export async function fetchGoToCallEventsReport(input: {
  accessToken: string;
  conversationSpaceId: string;
}) {
  const response = await fetch(
    `https://api.goto.com/call-events-report/v1/reports/${encodeURIComponent(input.conversationSpaceId)}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${input.accessToken}`,
      },
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error(`GoTo call report lookup failed with status ${response.status}.`);
  }

  return (await response.json()) as GoToCallEventsReport;
}
