import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, renderHook } from "@testing-library/react";
import { ToastContext, useToast, Providers } from "../QueryClientProvider";
import { useContext } from "react";

describe("useToast", () => {
  it("throws error when used outside of Providers", () => {
    expect(() => renderHook(() => useToast())).toThrow("useToast must be used within Providers");
  });

  it("returns toast context when used inside Providers", () => {
    const { result } = renderHook(() => useToast(), { wrapper: Providers });
    expect(result.current.addToast).toBeDefined();
    expect(result.current.removeToast).toBeDefined();
    expect(result.current.toasts).toEqual([]);
  });
});

describe("ToastProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a toast and renders it", () => {
    render(
      <Providers>
        <ToastContext.Consumer>
          {(ctx) => (
            <button onClick={() => ctx!.addToast("Test message", "success")}>
              Add Toast
            </button>
          )}
        </ToastContext.Consumer>
      </Providers>
    );

    act(() => {
      screen.getByText("Add Toast").click();
    });

    expect(screen.getByText("Test message")).toBeInTheDocument();
  });

  it("removes a toast when removeToast is called", () => {
    render(
      <Providers>
        <ToastContext.Consumer>
          {(ctx) => (
            <>
              <button onClick={() => ctx!.addToast("Remove me", "info")}>
                Add Toast
              </button>
              <button onClick={() => ctx!.removeToast(ctx!.toasts[0]?.id ?? "")}>
                Remove Toast
              </button>
            </>
          )}
        </ToastContext.Consumer>
      </Providers>
    );

    act(() => {
      screen.getByText("Add Toast").click();
    });

    expect(screen.getByText("Remove me")).toBeInTheDocument();

    act(() => {
      screen.getByText("Remove Toast").click();
    });

    expect(screen.queryByText("Remove me")).not.toBeInTheDocument();
  });

  it("auto-dismisses toast after 5000ms", () => {
    render(
      <Providers>
        <ToastContext.Consumer>
          {(ctx) => (
            <button onClick={() => ctx!.addToast("Auto dismiss", "error")}>
              Add Toast
            </button>
          )}
        </ToastContext.Consumer>
      </Providers>
    );

    act(() => {
      screen.getByText("Add Toast").click();
    });

    expect(screen.getByText("Auto dismiss")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText("Auto dismiss")).not.toBeInTheDocument();
  });

  it("renders success toast with green background", () => {
    render(
      <Providers>
        <ToastContext.Consumer>
          {(ctx) => (
            <button onClick={() => ctx!.addToast("Success!", "success")}>
              Add Toast
            </button>
          )}
        </ToastContext.Consumer>
      </Providers>
    );

    act(() => {
      screen.getByText("Add Toast").click();
    });

    const toast = screen.getByText("Success!").closest("div");
    expect(toast?.className).toContain("bg-green-600");
  });

  it("renders error toast with red background", () => {
    render(
      <Providers>
        <ToastContext.Consumer>
          {(ctx) => (
            <button onClick={() => ctx!.addToast("Error!", "error")}>
              Add Toast
            </button>
          )}
        </ToastContext.Consumer>
      </Providers>
    );

    act(() => {
      screen.getByText("Add Toast").click();
    });

    const toast = screen.getByText("Error!").closest("div");
    expect(toast?.className).toContain("bg-red-600");
  });

  it("renders info toast with blue background", () => {
    render(
      <Providers>
        <ToastContext.Consumer>
          {(ctx) => (
            <button onClick={() => ctx!.addToast("Info!", "info")}>
              Add Toast
            </button>
          )}
        </ToastContext.Consumer>
      </Providers>
    );

    act(() => {
      screen.getByText("Add Toast").click();
    });

    const toast = screen.getByText("Info!").closest("div");
    expect(toast?.className).toContain("bg-blue-600");
  });

  it("removes toast when clicked", () => {
    render(
      <Providers>
        <ToastContext.Consumer>
          {(ctx) => (
            <button onClick={() => ctx!.addToast("Click to dismiss", "info")}>
              Add Toast
            </button>
          )}
        </ToastContext.Consumer>
      </Providers>
    );

    act(() => {
      screen.getByText("Add Toast").click();
    });

    const toast = screen.getByText("Click to dismiss");
    expect(toast).toBeInTheDocument();

    act(() => {
      toast.click();
    });

    expect(screen.queryByText("Click to dismiss")).not.toBeInTheDocument();
  });

  it("supports multiple toasts simultaneously", () => {
    render(
      <Providers>
        <ToastContext.Consumer>
          {(ctx) => (
            <>
              <button onClick={() => ctx!.addToast("First", "success")}>
                Add First
              </button>
              <button onClick={() => ctx!.addToast("Second", "error")}>
                Add Second
              </button>
            </>
          )}
        </ToastContext.Consumer>
      </Providers>
    );

    act(() => {
      screen.getByText("Add First").click();
      screen.getByText("Add Second").click();
    });

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });
});
