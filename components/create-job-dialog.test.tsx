import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateJobApplicationDialog from "./create-job-dialog";

const { createJob } = vi.hoisted(() => ({ createJob: vi.fn() }));
vi.mock("@/lib/actions/job-applications", () => ({ createJobApplication: createJob }));

async function openForm() {
  const user = userEvent.setup();
  render(<CreateJobApplicationDialog boardId="board" columnId="column" />);
  await user.click(screen.getByRole("button", { name: "Add Job" }));
  await user.type(screen.getByLabelText("Company *"), "Example Company");
  await user.type(screen.getByLabelText("Position *"), "Engineer");
  return user;
}

beforeEach(() => { createJob.mockReset(); });

describe("create job dialog", () => {
  it("disables submission and prevents duplicate requests while saving", async () => {
    let finish!: (value: object) => void;
    createJob.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const user = await openForm();
    const submit = screen.getByRole("button", { name: "Add Application" });
    await user.click(submit);
    expect(submit).toBeDisabled();
    expect(submit).toHaveTextContent("Adding application");
    fireEvent.submit(submit.closest("form")!);
    expect(createJob).toHaveBeenCalledOnce();
    await act(async () => finish({ data: { id: "job" } }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each(["returned", "thrown"])("retains inputs after a %s failure, clears the alert on retry, and resets after success", async (failure) => {
    const nativeAlert = vi.spyOn(window, "alert").mockImplementation(() => {});
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    if (failure === "returned") createJob.mockResolvedValueOnce({ error: "private database details" });
    else createJob.mockRejectedValueOnce(new Error("private database details"));
    const user = await openForm();
    await user.type(screen.getByLabelText("Tags (comma-separated)"), " React, , TypeScript , ");
    await user.type(screen.getByLabelText("Notes"), "Follow up");
    await user.click(screen.getByRole("button", { name: "Add Application" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to add application. Please try again.");
    expect(screen.getByRole("dialog")).not.toHaveTextContent("private database details");
    expect(screen.getByLabelText("Company *")).toHaveValue("Example Company");
    expect(screen.getByLabelText("Position *")).toHaveValue("Engineer");
    expect(screen.getByLabelText("Tags (comma-separated)")).toHaveValue(" React, , TypeScript , ");
    expect(screen.getByLabelText("Notes")).toHaveValue("Follow up");
    await user.type(screen.getByLabelText("Notes"), " tomorrow");
    expect(screen.getByRole("alert")).toBeVisible();
    expect(createJob).toHaveBeenCalledWith({
      boardId: "board", columnId: "column", company: "Example Company", position: "Engineer",
      tags: ["React", "TypeScript"], notes: "Follow up", location: "", salary: "", jobUrl: "", description: "",
    });
    let finish!: (value: object) => void;
    createJob.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    await user.click(screen.getByRole("button", { name: "Add Application" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adding application…" })).toBeDisabled();
    expect(createJob).toHaveBeenCalledTimes(2);
    await act(async () => finish({ data: { id: "job" } }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add Job" }));
    for (const input of screen.getAllByRole("textbox")) expect(input).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(nativeAlert).not.toHaveBeenCalled();
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("renders one accessible non-nested dialog trigger", () => {
    const { container } = render(<CreateJobApplicationDialog boardId="board" columnId="column" />);
    expect(screen.getAllByRole("button", { name: "Add Job" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Add Job" })).toHaveAttribute("aria-haspopup", "dialog");
    expect(container.querySelector("button button, a button, button a")).toBeNull();
  });
});
