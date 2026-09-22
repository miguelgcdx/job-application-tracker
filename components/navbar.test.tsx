import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignOutButton from "./sign-out-btn";
import Navbar from "./navbar";
import { DropdownMenu, DropdownMenuContent } from "./ui/dropdown-menu";

const { signOut, push, replace, refresh, useSession } = vi.hoisted(() => ({
  signOut: vi.fn(), push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), useSession: vi.fn(),
}));
vi.mock("@/lib/auth/auth-client", () => ({ signOut, useSession }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace, refresh }) }));

beforeEach(() => {
  signOut.mockReset();
  useSession.mockReturnValue({ data: null, isPending: false });
});

describe("sign out", () => {
  it("disables retries while signing out and navigates after success", async () => {
    let finish!: (value: object) => void;
    signOut.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const user = userEvent.setup();
    render(<DropdownMenu open><DropdownMenuContent><SignOutButton /></DropdownMenuContent></DropdownMenu>);
    const item = screen.getByRole("menuitem", { name: "Log Out" });
    await user.click(item);
    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveTextContent("Signing out");
    await user.click(item);
    expect(signOut).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    await act(async () => finish({ data: { success: true } }));
    expect(replace).toHaveBeenCalledExactlyOnceWith("/sign-in");
    expect(refresh).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });

  it.each(["returned", "thrown"])("keeps a safe %s error in the menu and supports retry without a native alert", async (failure) => {
    const nativeAlert = vi.spyOn(window, "alert").mockImplementation(() => {});
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    if (failure === "returned") signOut.mockResolvedValueOnce({ error: { message: "private auth details" } });
    else signOut.mockRejectedValueOnce(new Error("private auth details"));
    useSession.mockReturnValue({ data: { user: { name: "Test", email: "test@example.invalid" } }, isPending: false });
    const user = userEvent.setup();
    render(<Navbar />);
    screen.getByRole("button", { name: "Open account menu" }).focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("menuitem", { name: "Log Out" }));
    const menu = screen.getByRole("menu");
    expect(await within(menu).findByRole("alert")).toHaveTextContent("Unable to sign out. Please try again.");
    expect(menu).not.toHaveTextContent("private auth details");
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    await user.keyboard("{ArrowUp}");
    expect(within(menu).getByRole("alert")).toBeVisible();
    let finish!: (value: object) => void;
    signOut.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    await user.click(screen.getByRole("menuitem", { name: "Log Out" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Signing out…" })).toHaveAttribute("aria-disabled", "true");
    expect(signOut).toHaveBeenCalledTimes(2);
    await act(async () => finish({ data: { success: true } }));
    expect(replace).toHaveBeenCalledExactlyOnceWith("/sign-in");
    expect(refresh).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
    expect(nativeAlert).not.toHaveBeenCalled();
    expect(errorLog).not.toHaveBeenCalled();
  });
});

describe("navigation", () => {
  it("preserves anonymous links without nested interactive controls", () => {
    const { container } = render(<Navbar />);
    expect(screen.getByRole("link", { name: "Log In" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("link", { name: "Start for free" })).toHaveAttribute("href", "/sign-up");
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(container.querySelector("button button, a button, button a")).toBeNull();
  });

  it("preserves authenticated links and labels the non-nested account trigger", () => {
    useSession.mockReturnValue({ data: { user: { name: "Test", email: "test@example.invalid" } }, isPending: false });
    const { container } = render(<Navbar />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("button", { name: "Open account menu" })).toHaveAttribute("aria-haspopup", "menu");
    expect(screen.queryByRole("link", { name: "Log In" })).not.toBeInTheDocument();
    expect(container.querySelector("button button, a button, button a")).toBeNull();
  });

  it.each([null, { user: { name: "Test", email: "test@example.invalid" } }])("shows only a status while the session is pending", (data) => {
    useSession.mockReturnValue({ data, isPending: true });
    render(<Navbar />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading account");
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("link", { name: "Log In" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Start for free" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open account menu" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Job Tracker" })).toHaveAttribute("href", "/");
  });
});
