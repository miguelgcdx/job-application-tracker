import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DashboardError from "./error";
import DashboardLoading from "./loading";
import NotFound from "../not-found";

describe("route fallbacks", () => {
  it("announces dashboard loading without exposing decorative placeholders", () => {
    render(<DashboardLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your dashboard");
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("offers useful navigation from an unknown route", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
  });
});

describe("dashboard error recovery", () => {
  it("offers safe recovery copy and calls reset when retrying", async () => {
    const reset = vi.fn();
    const user = userEvent.setup();
    render(<DashboardError error={new Error("private database details")} reset={reset} />);
    expect(screen.queryByRole("heading", { name: "We couldn't load your dashboard" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it("never renders or logs the supplied error, stack, or digest", () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const infoLog = vi.spyOn(console, "info").mockImplementation(() => {});
    const error = Object.assign(new Error("private database details"), {
      stack: "private-stack", digest: "private-digest",
    });
    const reset = vi.fn();
    const { container } = render(<DashboardError error={error} reset={reset} />);
    expect(container.innerHTML).not.toMatch(/private/);
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
    expect(reset).not.toHaveBeenCalled();
    expect(errorLog).not.toHaveBeenCalled();
    expect(infoLog).not.toHaveBeenCalled();
  });
});
