import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EscrowForm } from "./EscrowForm";

describe("EscrowForm", () => {
  it("blocks submission and shows an error when addresses are missing", () => {
    const onCreate = vi.fn();
    render(<EscrowForm onCreate={onCreate} />);

    fireEvent.click(screen.getByText("Lock funds in escrow"));

    expect(
      screen.getByText(/buyer, seller, and arbiter addresses/i),
    ).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("submits a well-formed escrow with lovelace converted from ADA", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<EscrowForm onCreate={onCreate} />);

    fireEvent.change(screen.getByLabelText("Buyer address"), {
      target: { value: "addr_test1buyer" },
    });
    fireEvent.change(screen.getByLabelText("Seller address"), {
      target: { value: "addr_test1seller" },
    });
    fireEvent.change(screen.getByLabelText("Arbiter address"), {
      target: { value: "addr_test1arbiter" },
    });
    fireEvent.change(screen.getByLabelText("Milestone amount (ADA)"), {
      target: { value: "25" },
    });

    const future = new Date(Date.now() + 7 * 86_400_000);
    const local = future.toISOString().slice(0, 16);
    fireEvent.change(screen.getByLabelText("Refund deadline"), {
      target: { value: local },
    });

    fireEvent.click(screen.getByText("Lock funds in escrow"));

    await vi.waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    const [input] = onCreate.mock.calls[0];
    expect(input.buyerAddress).toBe("addr_test1buyer");
    expect(input.milestoneAmountLovelace).toBe(25_000_000);
  });
});
