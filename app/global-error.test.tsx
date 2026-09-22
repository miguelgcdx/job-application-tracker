import { render, within } from "@testing-library/react";
import { StrictMode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as Sentry from "@sentry/nextjs";
import { describe, expect, it, vi } from "vitest";
import GlobalError from "./global-error";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

describe("global error boundary", () => {
  it("provides its own safe document without exposing error details", () => {
    const error = Object.assign(new Error("private-message"), { stack: "private-stack", digest: "private-digest" });
    const html = renderToStaticMarkup(<GlobalError error={error} />);
    expect(html).toContain("<html");
    expect(html).toContain("<body");
    expect(html).not.toContain("private");
    expect(html).toContain('href="/"');
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("captures each distinct object once from an effect, including StrictMode and repeated errors", () => {
    const first = new Error("private-first");
    const second = new Error("private-second");
    const view = (error: Error) => <StrictMode><GlobalError error={error} /></StrictMode>;
    const { rerender } = render(view(first), { container: document });
    expect(Sentry.captureException).toHaveBeenCalledExactlyOnceWith(first);
    expect(within(document.body).getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(within(document.body).getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
    rerender(view(first));
    rerender(view(second));
    rerender(view(first));
    expect(Sentry.captureException).toHaveBeenCalledTimes(2);
    expect(Sentry.captureException).toHaveBeenLastCalledWith(second);
    expect(document.body.textContent).not.toContain("private");
  });
});
