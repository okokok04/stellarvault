import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders a human-readable label for each status", () => {
    render(<StatusBadge status="locked" />);
    expect(screen.getByText("Locked")).toBeInTheDocument();
  });

  it("applies a status-specific class for styling", () => {
    render(<StatusBadge status="released" />);
    expect(screen.getByText("Released")).toHaveClass("badge-released");
  });
});
