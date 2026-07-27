import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedbackList } from "./FeedbackList";
import type { FeedbackRecord } from "../types/feedback";

function makeFeedback(overrides: Partial<FeedbackRecord> = {}): FeedbackRecord {
  return {
    id: "f1",
    rating: 4,
    message: "Locking felt smooth.",
    status: "new",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("FeedbackList", () => {
  it("renders no triage actions when onUpdateStatus is omitted", () => {
    render(<FeedbackList feedback={[makeFeedback()]} loading={false} />);
    expect(screen.queryByText(/mark triaged/i)).not.toBeInTheDocument();
  });

  it("offers every status except the current one, and calls onUpdateStatus", async () => {
    const onUpdateStatus = vi.fn().mockResolvedValue(undefined);
    render(
      <FeedbackList
        feedback={[makeFeedback({ status: "triaged" })]}
        loading={false}
        onUpdateStatus={onUpdateStatus}
      />,
    );

    expect(screen.queryByText(/mark triaged/i)).not.toBeInTheDocument();
    expect(screen.getByText(/mark actioned/i)).toBeInTheDocument();
    expect(screen.getByText(/mark won't fix/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/mark actioned/i));
    await vi.waitFor(() => expect(onUpdateStatus).toHaveBeenCalledWith("f1", "actioned"));
  });

  it("filters the list by status", () => {
    const feedback = [
      makeFeedback({ id: "a", status: "new", message: "First one" }),
      makeFeedback({ id: "b", status: "actioned", message: "Second one" }),
    ];
    render(<FeedbackList feedback={feedback} loading={false} />);

    expect(screen.getByText("First one")).toBeInTheDocument();
    expect(screen.getByText("Second one")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Actioned" }));

    expect(screen.queryByText("First one")).not.toBeInTheDocument();
    expect(screen.getByText("Second one")).toBeInTheDocument();
  });
});
