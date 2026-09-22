// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const actionMocks = vi.hoisted(() => ({ session: vi.fn(), work: vi.fn(), revalidate: vi.fn() }));
vi.mock("../auth/auth", () => ({ getSession: actionMocks.session }));
vi.mock("../job-applications/mongoose-repository", () => ({ jobStore: {} }));
vi.mock("../job-applications/service", () => ({
  createJobService: () => ({ create: actionMocks.work, update: actionMocks.work, delete: actionMocks.work }),
}));
vi.mock("next/cache", () => ({ revalidatePath: actionMocks.revalidate }));

import { logServerEvent, type ServerEvent } from "./server-logger";
import { createJobApplication, updateJobApplication, deleteJobApplication } from "../actions/job-applications";

const failure: ServerEvent = {
  event: "board_load", operation: "load", outcome: "failure",
  durationMs: 12.8, errorType: "internal", environment: "test", release: "unknown",
};

afterEach(() => vi.unstubAllEnvs());

// Instrumentation seams only: no authentication provider or database is contacted.
const actions = [
  { operation: "create", call: () => createJobApplication({ company: "private", position: "private", boardId: "private", columnId: "private" }), expected: { data: true } },
  { operation: "update", call: () => updateJobApplication("private", { company: "private" }), expected: { data: true } },
  { operation: "delete", call: () => deleteJobApplication("private"), expected: { success: true } },
];

describe.each(actions)("$operation action logging", ({ operation, call, expected }) => {
  beforeEach(() => {
    actionMocks.session.mockReset().mockResolvedValue({ user: { id: "private" } });
    actionMocks.work.mockReset();
    actionMocks.revalidate.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it.each(["UNAUTHENTICATED", "INVALID_INPUT", "NOT_FOUND"])("keeps %s denials quiet", async (code) => {
    actionMocks.work.mockResolvedValue({ ok: false, code });
    expect(await call()).toEqual({ error: expect.any(String) });
    expect(console.error).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
    expect(actionMocks.revalidate).not.toHaveBeenCalled();
  });

  it("logs one safe persistence failure and keeps the public error contract", async () => {
    actionMocks.work.mockResolvedValue({ ok: false, code: "PERSISTENCE_ERROR" });
    vi.spyOn(performance, "now").mockReturnValueOnce(10).mockReturnValueOnce(35);
    expect(await call()).toEqual({ error: "Unable to save job application. Please try again." });
    expect(console.error).toHaveBeenCalledOnce();
    const serialized = vi.mocked(console.error).mock.calls[0][0];
    expect(JSON.parse(serialized)).toMatchObject({ event: "job_mutation", operation, outcome: "failure", durationMs: 25, errorType: "persistence" });
    expect(serialized).not.toContain("private");
    expect(actionMocks.revalidate).not.toHaveBeenCalled();
  });

  it.each(["session", "work", "revalidate"] as const)("logs and rethrows unexpected %s failures once", async (stage) => {
    const error = new Error("private");
    actionMocks.work.mockResolvedValue({ ok: true, data: true });
    if (stage === "revalidate") actionMocks.revalidate.mockImplementation(() => { throw error; });
    else actionMocks[stage].mockRejectedValue(error);
    await expect(call()).rejects.toBe(error);
    expect(console.error).toHaveBeenCalledOnce();
    const serialized = vi.mocked(console.error).mock.calls[0][0];
    expect(JSON.parse(serialized)).toMatchObject({ operation, errorType: "internal" });
    expect(serialized).not.toContain("private");
    if (stage !== "revalidate") expect(actionMocks.revalidate).not.toHaveBeenCalled();
  });

  it("revalidates only success and preserves the public success contract", async () => {
    actionMocks.work.mockResolvedValue({ ok: true, data: true });
    expect(await call()).toEqual(expected);
    expect(actionMocks.revalidate).toHaveBeenCalledExactlyOnceWith("/dashboard");
    expect(console.error).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
  });
});

describe("server logger", () => {
  it("emits only safe structured metadata for failures", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logServerEvent(failure);
    expect(error).toHaveBeenCalledExactlyOnceWith(JSON.stringify({ ...failure, durationMs: 12 }));
    expect(info).not.toHaveBeenCalled();
  });

  it("drops sensitive extras, raw errors, and custom serialization", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const toJSON = vi.fn(() => "secret");
    const secret = {
      error: new Error("secret"), message: "secret", stack: "secret", request: { toJSON },
      headers: "secret", cookies: "secret", token: "secret", userId: "secret",
      boardId: "secret", jobId: "secret", url: "https://secret", company: "secret",
      notes: "secret", toJSON,
    };
    logServerEvent({ ...failure, ...secret });
    expect(JSON.parse(error.mock.calls[0][0])).toEqual({ ...failure, durationMs: 12 });
    expect(error.mock.calls[0][0]).not.toContain("secret");
    expect(toJSON).not.toHaveBeenCalled();
  });

  it.each(["success", "unavailable", "unknown"] as const)("uses info for %s", (outcome) => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logServerEvent({ ...failure, outcome });
    expect(info).toHaveBeenCalledOnce();
    expect(JSON.parse(info.mock.calls[0][0])).toMatchObject({ outcome, errorType: "none" });
    expect(error).not.toHaveBeenCalled();
  });

  it.each([[NaN, 0], [Infinity, 0], [-3, 0], [1.9, 1], [1e12, 86_400_000], ["secret", 0], [null, 0]])(
    "normalizes duration %s to %s", (durationMs, expected) => {
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      logServerEvent({ ...failure, durationMs } as ServerEvent);
      expect(JSON.parse(error.mock.calls[0][0]).durationMs).toBe(expected);
    },
  );

  it("normalizes malformed enums without serializing their contents", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logServerEvent({ event: "secret", operation: {}, outcome: "secret", durationMs: 0,
      errorType: new Error("secret"), environment: "secret", release: "https://secret" } as unknown as ServerEvent);
    expect(JSON.parse(info.mock.calls[0][0])).toEqual({
      event: "unknown", operation: "unknown", outcome: "unknown", durationMs: 0,
      errorType: "none", environment: "unknown", release: "unknown",
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    logServerEvent({ ...failure, errorType: new Error("secret") } as unknown as ServerEvent);
    expect(JSON.parse(error.mock.calls[0][0]).errorType).toBe("unknown");
  });

  it.each([null, undefined, 42, "secret"])("handles malformed input %s", (input) => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    logServerEvent(input as unknown as ServerEvent);
    expect(JSON.parse(info.mock.calls[0][0])).toMatchObject({ event: "unknown", outcome: "unknown", durationMs: 0 });
  });

  it.each(["development", "preview", "production", "test", "secret"])("normalizes runtime metadata %s", (environment) => {
    vi.stubEnv("VERCEL_ENV", environment === "development" ? undefined : environment);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "A".repeat(40));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    logServerEvent({ ...failure, environment: undefined, release: undefined });
    expect(JSON.parse(error.mock.calls[0][0])).toMatchObject({
      environment: environment === "development" ? "local" : environment === "secret" ? "unknown" : environment,
      release: "a".repeat(40),
    });
  });
});
