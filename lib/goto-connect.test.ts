import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getGoToCallFailureMessage,
  resolveGoToAccount,
  resolveGoToLineByExtension,
  resolveGoToLinesByExtensions,
  testGoToConnection,
} from "./goto-connect";

describe("GoTo Connect helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports a successful connection and resolves an extension", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      json: async () => ({
        items: [
          {
            lines: [
              {
                id: "line_123",
                name: "Advisor Desk",
                number: "1545",
              },
            ],
          },
        ],
      }),
      ok: true,
      status: 200,
    } as Response);

    await expect(
      testGoToConnection({
        accessToken: "token",
        accountKey: "account",
        extension: "1545",
      }),
    ).resolves.toEqual({
      lineCount: 1,
      matchedLineId: "line_123",
      matchedLineName: "Advisor Desk",
      message:
        "Connected to GoTo Connect using account account and resolved extension 1545 to line line_123.",
      ok: true,
      testedExtension: "1545",
      userCount: 1,
    });
  });

  it("discovers the GoTo account from the token when no account key is supplied", async () => {
    const fetchMock = vi.spyOn(global, "fetch");

    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({
          accounts: [
            {
              key: "account_123",
              name: "My Service Drive",
            },
          ],
        }),
        ok: true,
        status: 200,
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          items: [],
        }),
        ok: true,
        status: 200,
      } as Response);

    await expect(
      testGoToConnection({
        accessToken: "token",
      }),
    ).resolves.toEqual({
      lineCount: 0,
      matchedLineId: null,
      matchedLineName: null,
      message:
        "Connected to GoTo Connect. Using account account_123. Found 0 users and 0 lines.",
      ok: true,
      testedExtension: null,
      userCount: 0,
    });
  });

  it("requires a manual account key when the token can access multiple accounts", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      json: async () => ({
        accounts: [
          {
            key: "account_123",
            name: "Org One",
          },
          {
            key: "account_456",
            name: "Org Two",
          },
        ],
      }),
      ok: true,
      status: 200,
    } as Response);

    await expect(
      resolveGoToAccount({
        accessToken: "token",
      }),
    ).resolves.toEqual({
      account: null,
      error:
        "This token can access multiple GoTo accounts. Open Advanced and enter the Account Key manually.",
    });
  });

  it("returns a failure when the API rejects the lookup", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
    } as Response);

    await expect(
      testGoToConnection({
        accessToken: "token",
        accountKey: "account",
      }),
    ).resolves.toEqual({
      lineCount: 0,
      matchedLineId: null,
      matchedLineName: null,
      message: "GoTo lookup failed with status 403.",
      ok: false,
      testedExtension: null,
      userCount: 0,
    });
  });

  it("resolves a line by extension from the user payload", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      json: async () => ({
        items: [
          {
            lines: [
              {
                id: "line_123",
                name: "Advisor Desk",
                number: "1545",
              },
            ],
          },
        ],
      }),
      ok: true,
      status: 200,
    } as Response);

    await expect(
      resolveGoToLineByExtension({
        accessToken: "token",
        accountKey: "account",
        extension: "1545",
      }),
    ).resolves.toEqual({
      lineId: "line_123",
      lineName: "Advisor Desk",
      number: "1545",
    });
  });

  it("resolves multiple extensions from one GoTo lookup", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      json: async () => ({
        items: [
          {
            lines: [
              {
                id: "line_123",
                name: "Advisor Desk",
                number: "1545",
              },
              {
                id: "line_456",
                name: "Advisor Two",
                number: "2001",
              },
            ],
          },
        ],
      }),
      ok: true,
      status: 200,
    } as Response);

    const result = await resolveGoToLinesByExtensions({
      accessToken: "token",
      accountKey: "account",
      extensions: ["1545", "2001", "9999"],
    });

    expect(Array.from(result.entries())).toEqual([
      [
        "1545",
        {
          lineId: "line_123",
          lineName: "Advisor Desk",
          number: "1545",
        },
      ],
      [
        "2001",
        {
          lineId: "line_456",
          lineName: "Advisor Two",
          number: "2001",
        },
      ],
    ]);
  });

  it("formats GoTo call auth failures into a user-facing message", async () => {
    await expect(
      getGoToCallFailureMessage(
        new Response(
          JSON.stringify({
            errorCode: "AUTHN_EXPIRED_TOKEN",
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
            status: 401,
          },
        ),
      ),
    ).resolves.toBe(
      "GoTo Connect rejected the access token. Check the token and try again.",
    );
  });

  it("formats GoTo call constraint violations into a user-facing message", async () => {
    await expect(
      getGoToCallFailureMessage(
        new Response(
          JSON.stringify({
            constraintViolations: [
              {
                description: "The value is malformed.",
                field: "from.lineId",
              },
            ],
          }),
          {
            headers: {
              "Content-Type": "application/json",
            },
            status: 400,
          },
        ),
      ),
    ).resolves.toBe(
      "GoTo Connect rejected the call request: from.lineId: The value is malformed.",
    );
  });
});
