import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeedbackForm } from "./FeedbackForm";

describe("FeedbackForm", () => {
  it("blocks submission without a message", () => {
    const onSubmit = vi.fn();
    render(<FeedbackForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Rating (1-5)"), {
      target: { value: "5" },
    });
    fireEvent.click(screen.getByText("Send feedback"));

    expect(screen.getByText(/say a bit about/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits rating + message, omitting empty optional fields", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<FeedbackForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Rating (1-5)"), {
      target: { value: "4" },
    });
    fireEvent.change(screen.getByLabelText("What happened?"), {
      target: { value: "Locking felt smooth." },
    });

    fireEvent.click(screen.getByText("Send feedback"));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      rating: 4,
      message: "Locking felt smooth.",
      walletAddress: undefined,
      contact: undefined,
    });
  });
});
