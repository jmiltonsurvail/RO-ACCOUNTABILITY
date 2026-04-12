import { prisma } from "@/lib/prisma";
import { formatPhoneHref } from "@/lib/utils";

export type GoToConnectSettingsValues = {
  accountKey: string | null;
  accessToken: string | null;
  autoAnswer: boolean;
  clientId: string | null;
  clientSecret: string | null;
  enabled: boolean;
  launchUrlTemplate: string | null;
  organizationId: string | null;
  phoneNumberId: string | null;
};

export const defaultGoToConnectSettings: GoToConnectSettingsValues = {
  accountKey: null,
  accessToken: null,
  autoAnswer: false,
  clientId: null,
  clientSecret: null,
  enabled: false,
  launchUrlTemplate: null,
  organizationId: null,
  phoneNumberId: null,
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
    accessToken: settings.accessToken,
    autoAnswer: settings.autoAnswer,
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    enabled: settings.enabled,
    launchUrlTemplate: settings.launchUrlTemplate,
    organizationId: settings.goToOrganizationId,
    phoneNumberId: settings.phoneNumberId,
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

export type ResolvedGoToLine = {
  lineId: string;
  lineName: string | null;
  number: string;
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
  accountKey: string | null;
  extension?: string | null;
}): Promise<GoToConnectionTestResult> {
  const testedExtension = normalizeExtension(input.extension);
  const result = await fetchGoToUsers({
    accessToken: input.accessToken,
    accountKey: input.accountKey,
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
      message: `Connected to GoTo Connect. Found ${users.length} users and ${lineCount} lines.`,
      ok: true,
      testedExtension: null,
      userCount: users.length,
    };
  }

  const resolvedLine = await resolveGoToLineByExtension({
    accessToken: input.accessToken,
    accountKey: input.accountKey,
    extension: testedExtension,
  });

  if (!resolvedLine) {
    return {
      lineCount,
      matchedLineId: null,
      matchedLineName: null,
      message: `Connected to GoTo Connect, but extension ${testedExtension} did not resolve to a line.`,
      ok: false,
      testedExtension,
      userCount: users.length,
    };
  }

  return {
    lineCount,
    matchedLineId: resolvedLine.lineId,
    matchedLineName: resolvedLine.lineName,
    message: `Connected to GoTo Connect and resolved extension ${testedExtension} to line ${resolvedLine.lineId}.`,
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
