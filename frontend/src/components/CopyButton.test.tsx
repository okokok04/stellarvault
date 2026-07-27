import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "./CopyButton";

describe("CopyButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("copies the given value to the clipboard and shows confirmation", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<CopyButton value="addr_test1abc" />);
    fireEvent.click(screen.getByRole("button"));

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("addr_test1abc"));
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  it("fails silently if the clipboard API rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.assign(navigator, { clipboard: { writeText } });

    render(<CopyButton value="addr_test1abc" />);
    fireEvent.click(screen.getByRole("button"));

    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });
});
