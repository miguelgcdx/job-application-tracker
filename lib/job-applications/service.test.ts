import { beforeEach, describe, expect, it, vi } from "vitest";
import { createJobService, type Job, type JobRepository, type JobStore } from "./service";
import type { CreateJobInput } from "./schemas";

const boundary = vi.hoisted(() => ({
  session: vi.fn(), transaction: vi.fn(), revalidate: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: boundary.revalidate }));
vi.mock("../auth/auth", () => ({ getSession: boundary.session }));
vi.mock("../observability/server-logger", () => ({ logServerEvent: vi.fn() }));
vi.mock("./mongoose-repository", () => ({ jobStore: { transaction: boundary.transaction } }));
import { createJobApplication, updateJobApplication, deleteJobApplication } from "../actions/job-applications";

const ids = {
  board: "111111111111111111111111",
  source: "222222222222222222222222",
  target: "333333333333333333333333",
  job: "444444444444444444444444",
  otherJob: "555555555555555555555555",
  otherBoard: "666666666666666666666666",
  created: "777777777777777777777777",
};
const input: CreateJobInput = {
  company: "Company", position: "Engineer", boardId: ids.board, columnId: ids.source,
};
const existing: Job = { ...input, _id: ids.job, status: "applied", order: 0 };
interface OwnedJob { owner: string; job: Job }

// This fake proves service policy and sequencing, not Mongo rollback or sessions.
function fixture() {
  const state = {
    boards: new Map([[ids.board, "actor"], [ids.otherBoard, "other"]]),
    columns: new Map([[ids.source, ids.board], [ids.target, ids.board]]),
    jobs: new Map<string, OwnedJob>([[ids.job, { owner: "actor", job: { ...existing } }]]),
    events: [] as string[],
    writes: [] as string[],
    failPush: false,
  };
  const store: JobStore = {
    async transaction<T>(actor: string, work: (repo: JobRepository) => Promise<T>): Promise<T> {
      state.events.push(`begin:${actor}`);
      const write = (event: string) => { state.writes.push(event); state.events.push(event); };
      const repo: JobRepository = {
        async ownsBoard(id) {
          state.events.push("board");
          return state.boards.get(id) === actor;
        },
        async hasColumn(id, boardId) {
          state.events.push(`column:${id}`);
          return state.columns.get(id) === boardId;
        },
        async findJob(id) {
          state.events.push("job");
          const found = state.jobs.get(id);
          return found?.owner === actor ? { ...found.job } : null;
        },
        async listJobs(columnId, boardId) {
          state.events.push("list");
          return [...state.jobs.values()]
            .filter(({ owner, job }) => owner === actor && job.columnId === columnId && job.boardId === boardId)
            .map(({ job }) => ({ _id: job._id, order: job.order }))
            .sort((a, b) => a.order - b.order || a._id.localeCompare(b._id));
        },
        async create(data, order) {
          write("create");
          const job = { ...data, _id: ids.created, order, status: "applied" };
          state.jobs.set(job._id, { owner: actor, job });
          return job;
        },
        async update(id, boardId, updates) {
          const found = state.jobs.get(id);
          if (!found || found.owner !== actor || found.job.boardId !== boardId) throw new Error("Scope violation");
          write(`update:${id}`);
          found.job = { ...found.job, ...updates };
          return { ...found.job };
        },
        async pull(id) { write(`pull:${id}`); },
        async push(id) {
          if (state.failPush) throw new Error("Private persistence details");
          write(`push:${id}`);
        },
        async delete(id, boardId) {
          const found = state.jobs.get(id);
          if (!found || found.owner !== actor || found.job.boardId !== boardId) throw new Error("Scope violation");
          write("delete");
          state.jobs.delete(id);
        },
      };
      try {
        const result = await work(repo);
        state.events.push("commit");
        return result;
      } catch (error) {
        state.events.push("abort");
        throw error;
      }
    },
  };
  return { ...state, store, service: createJobService(store), state };
}

let fake: ReturnType<typeof fixture>;
beforeEach(() => {
  fake = fixture();
  boundary.session.mockResolvedValue({ user: { id: "actor" } });
  boundary.transaction.mockImplementation(fake.store.transaction);
  boundary.revalidate.mockImplementation(() => fake.events.push("revalidate"));
});

describe("action security boundary", () => {
  it("rejects whitespace-only required fields before persistence", async () => {
    expect(await createJobApplication({ ...input, company: "   " })).toEqual({ error: expect.any(String) });
    expect(fake.writes).toEqual([]);
    expect(boundary.transaction).not.toHaveBeenCalled();
    expect(boundary.revalidate).not.toHaveBeenCalled();
  });

  it("rejects an empty update before persistence", async () => {
    expect(await updateJobApplication(ids.job, {})).toEqual({ error: expect.any(String) });
    expect(fake.writes).toEqual([]);
    expect(boundary.transaction).not.toHaveBeenCalled();
    expect(boundary.revalidate).not.toHaveBeenCalled();
  });

  it("denies every anonymous action without persistence or invalidation", async () => {
    boundary.session.mockResolvedValue(null);
    expect(await createJobApplication(input)).toEqual({ error: "Unauthorized" });
    expect(await updateJobApplication(ids.job, { company: "New" })).toEqual({ error: "Unauthorized" });
    expect(await deleteJobApplication(ids.job)).toEqual({ error: "Unauthorized" });
    expect(boundary.transaction).not.toHaveBeenCalled();
    expect(boundary.revalidate).not.toHaveBeenCalled();
  });

  it("does not accept a forged owner and never invalidates denied moves", async () => {
    expect(await createJobApplication({ ...input, userId: "other" } as CreateJobInput)).toEqual({ error: expect.any(String) });
    fake.columns.set(ids.target, ids.otherBoard);
    expect(await updateJobApplication(ids.job, { columnId: ids.target })).toEqual({ error: expect.any(String) });
    expect(fake.writes).toEqual([]);
    expect(boundary.revalidate).not.toHaveBeenCalled();
  });

  it("preserves mutation response shapes and invalidates only after commit", async () => {
    expect(await createJobApplication(input)).toMatchObject({ data: { _id: ids.created } });
    expect(await updateJobApplication(ids.job, { company: "New" })).toMatchObject({ data: { company: "New" } });
    expect(await updateJobApplication(ids.job, { columnId: ids.target, order: 0 })).toMatchObject({ data: { columnId: ids.target } });
    expect(await deleteJobApplication(ids.job)).toEqual({ success: true });
    expect(boundary.transaction.mock.calls.every(([actor]) => actor === "actor")).toBe(true);
    expect(boundary.revalidate).toHaveBeenCalledTimes(4);
    expect(boundary.revalidate).toHaveBeenCalledWith("/dashboard");
    fake.events.forEach((event, index) => {
      if (event === "revalidate") expect(fake.events[index - 1]).toBe("commit");
    });
  });

  it("maps persistence failures to a generic error without invalidation", async () => {
    fake.state.failPush = true;
    expect(await createJobApplication(input)).toEqual({ error: "Unable to save job application. Please try again." });
    expect(fake.events.at(-1)).toBe("abort");
    expect(boundary.revalidate).not.toHaveBeenCalled();
  });
});

describe("pure job service validation", () => {
  it.each([undefined, null, "", "  ", 123])("requires a session actor for every operation: %j", async (actor) => {
    expect(await fake.service.create(actor, input)).toEqual({ ok: false, code: "UNAUTHENTICATED" });
    expect(await fake.service.update(actor, ids.job, { company: "New" })).toEqual({ ok: false, code: "UNAUTHENTICATED" });
    expect(await fake.service.delete(actor, ids.job)).toEqual({ ok: false, code: "UNAUTHENTICATED" });
    expect(fake.events).toEqual([]);
  });

  it.each([
    null, {}, { ...input, company: " " }, { ...input, position: " " },
    { ...input, boardId: "bad" }, { ...input, columnId: "bad" },
    { ...input, jobUrl: "invalid" }, { ...input, jobUrl: "javascript:alert(1)" },
    { ...input, jobUrl: "ftp://example.com" }, { ...input, tags: [""] },
    { ...input, tags: "tag" }, { ...input, location: 7 },
    { ...input, description: {} }, { ...input, notes: [] }, { ...input, salary: 4 },
    { ...input, userId: "other" }, { ...input, actor: "other" }, { ...input, order: -1 },
  ])("rejects untrusted create payload %j without opening a transaction", async (data) => {
    expect(await fake.service.create("actor", data)).toEqual({ ok: false, code: "INVALID_INPUT" });
    expect(fake.events).toEqual([]);
  });

  it.each([
    {}, null, { company: undefined }, { company: " " }, { position: "" },
    { order: -1 }, { order: 1.5 }, { order: Infinity }, { order: "1" },
    { columnId: "bad" }, { jobUrl: "invalid" }, { tags: [" "] },
    { userId: "other" }, { actor: "other" }, { boardId: ids.otherBoard },
  ])("rejects untrusted update payload %j without opening a transaction", async (updates) => {
    expect(await fake.service.update("actor", ids.job, updates)).toEqual({ ok: false, code: "INVALID_INPUT" });
    expect(fake.events).toEqual([]);
  });

  it.each([null, "bad", "", { $ne: null }])("rejects invalid job ID %j on update and delete", async (id) => {
    expect(await fake.service.update("actor", id, { company: "New" })).toEqual({ ok: false, code: "INVALID_INPUT" });
    expect(await fake.service.delete("actor", id)).toEqual({ ok: false, code: "INVALID_INPUT" });
    expect(fake.events).toEqual([]);
  });

  it("normalizes strings and permits clearing optional fields", async () => {
    const result = await fake.service.create("actor", {
      ...input, company: " Company ", position: " Engineer ", location: " Remote ",
      description: " Description ", notes: " Notes ", salary: " 100 ",
      jobUrl: " https://example.com/job ", tags: [" Remote "],
    });
    expect(result).toMatchObject({ ok: true, data: {
      company: "Company", position: "Engineer", location: "Remote", description: "Description",
      notes: "Notes", salary: "100", jobUrl: "https://example.com/job", tags: ["Remote"],
    } });
    expect(await fake.service.update("actor", ids.job, {
      location: "", description: "", notes: "", salary: "", jobUrl: "", tags: [],
    })).toMatchObject({ ok: true, data: { location: "", jobUrl: "", tags: [] } });
  });
});

describe("ownership and zero-write denial", () => {
  it.each(["other", undefined])("conceals unowned or missing boards (%j)", async (owner) => {
    fake.boards.delete(ids.board);
    if (owner) fake.boards.set(ids.board, owner);
    expect(await fake.service.create("actor", input)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(fake.writes).toEqual([]);
  });

  it.each(["other", undefined])("conceals unowned or missing jobs (%j)", async (owner) => {
    fake.jobs.delete(ids.job);
    if (owner) fake.jobs.set(ids.job, { owner, job: { ...existing } });
    expect(await fake.service.update("actor", ids.job, { company: "New" })).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await fake.service.update("actor", ids.job, { columnId: ids.target })).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await fake.service.delete("actor", ids.job)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(fake.writes).toEqual([]);
  });

  it.each(["actor", "other", "missing"])("denies a destination outside the exact board (%s)", async (owner) => {
    fake.boards.set(ids.otherBoard, owner);
    fake.columns.set(ids.target, ids.otherBoard);
    if (owner === "missing") fake.columns.delete(ids.target);
    expect(await fake.service.create("actor", { ...input, columnId: ids.target })).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await fake.service.update("actor", ids.job, { columnId: ids.target, order: 0 })).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(fake.writes).toEqual([]);
    expect(fake.jobs.get(ids.job)?.job).toEqual(existing);
  });

  it("denies missing source columns before move or delete writes", async () => {
    fake.columns.delete(ids.source);
    expect(await fake.service.update("actor", ids.job, { columnId: ids.target })).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(await fake.service.delete("actor", ids.job)).toEqual({ ok: false, code: "NOT_FOUND" });
    expect(fake.writes).toEqual([]);
  });
});

describe("successful transactional sequencing", () => {
  it("authorizes create, appends after existing order, then links before commit", async () => {
    fake.jobs.get(ids.job)!.job.order = 700;
    expect(await fake.service.create("actor", input)).toMatchObject({ ok: true, data: { order: 800 } });
    expect(fake.events).toEqual([
      "begin:actor", "board", `column:${ids.source}`, "list", "create", `push:${ids.source}`, "commit",
    ]);
    expect(fake.jobs.get(ids.created)?.owner).toBe("actor");
  });

  it("creates at order zero in an empty column", async () => {
    expect(await fake.service.create("actor", { ...input, columnId: ids.target })).toMatchObject({ ok: true, data: { order: 0 } });
  });

  it("updates only the owned job without membership writes", async () => {
    expect(await fake.service.update("actor", ids.job, { company: " New " })).toMatchObject({ ok: true, data: { company: "New" } });
    expect(fake.events).toEqual(["begin:actor", "job", `update:${ids.job}`, "commit"]);
  });

  it("pulls, reorders, pushes, and updates the moved job in a single unit", async () => {
    fake.jobs.set(ids.otherJob, { owner: "actor", job: { ...existing, _id: ids.otherJob, columnId: ids.target, order: 1 } });
    expect(await fake.service.update("actor", ids.job, { columnId: ids.target, order: 0 })).toMatchObject({ ok: true, data: { columnId: ids.target, order: 0 } });
    expect(fake.events).toEqual([
      "begin:actor", "job", `column:${ids.target}`, `column:${ids.source}`, "list",
      `pull:${ids.source}`, `update:${ids.otherJob}`, `push:${ids.target}`, `update:${ids.job}`, "commit",
    ]);
    expect(fake.jobs.get(ids.otherJob)?.job.order).toBe(100);
  });

  it.each([undefined, 99])("appends to destination when order is omitted or beyond the end (%j)", async (order) => {
    fake.jobs.set(ids.otherJob, { owner: "actor", job: { ...existing, _id: ids.otherJob, columnId: ids.target, order: 1 } });
    expect(await fake.service.update("actor", ids.job, { columnId: ids.target, order })).toMatchObject({ ok: true, data: { order: 100 } });
    expect(fake.jobs.get(ids.otherJob)?.job.order).toBe(0);
  });

  it.each([0, 1])("normalizes same-column ordering at insertion position %i", async (order) => {
    fake.jobs.get(ids.job)!.job.order = order === 0 ? 2 : 0;
    fake.jobs.set(ids.otherJob, { owner: "actor", job: { ...existing, _id: ids.otherJob, order: 1 } });
    expect(await fake.service.update("actor", ids.job, { order })).toMatchObject({ ok: true, data: { order: order * 100 } });
    expect(fake.jobs.get(ids.otherJob)?.job.order).toBe(order === 0 ? 100 : 0);
    expect(fake.writes).toEqual([`pull:${ids.source}`, `update:${ids.otherJob}`, `push:${ids.source}`, `update:${ids.job}`]);
  });

  it("unlinks before deleting the owned job and committing", async () => {
    expect(await fake.service.delete("actor", ids.job)).toEqual({ ok: true, data: true });
    expect(fake.events).toEqual(["begin:actor", "job", `column:${ids.source}`, `pull:${ids.source}`, "delete", "commit"]);
    expect(fake.jobs.has(ids.job)).toBe(false);
  });
});
