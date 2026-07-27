import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EscrowList } from "./EscrowList";
import type { EscrowRecord } from "../types/escrow";

const noop = vi.fn().mockResolvedValue(undefined);

function makeEscrow(overrides: Partial<EscrowRecord>): EscrowRecord {
  return {
    id: Math.random().toString(36),
    buyerAddress: "addr_test1buyer",
    sellerAddress: "addr_test1seller",
    arbiterAddress: "addr_test1arbiter",
    milestoneAmountLovelace: 5_000_000,
    deadlineUnixMs: Date.now() + 86_400_000,
    status: "locked",
    scriptAddress: "addr_test1script",
    lockTxHash: "tx",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("EscrowList", () => {
  it("filters by status", () => {
    const escrows = [
      makeEscrow({ status: "locked" }),
      makeEscrow({ status: "released" }),
      makeEscrow({ status: "released" }),
    ];
    render(
      <EscrowList
        escrows={escrows}
        loading={false}
        onRelease={noop}
        onRefund={noop}
        onResolve={noop}
      />,
    );

    expect(screen.getAllByText("Released", { selector: ".badge" })).toHaveLength(2);
    expect(screen.getAllByText("Locked", { selector: ".badge" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Locked" }));

    expect(screen.getAllByText("Locked", { selector: ".badge" })).toHaveLength(1);
    expect(screen.queryByText("Released", { selector: ".badge" })).not.toBeInTheDocument();
  });

  it("paginates with a Show more button past the first page", () => {
    const escrows = Array.from({ length: 12 }, () => makeEscrow({ status: "locked" }));
    render(
      <EscrowList
        escrows={escrows}
        loading={false}
        onRelease={noop}
        onRefund={noop}
        onResolve={noop}
      />,
    );

    expect(screen.getAllByText("Locked", { selector: ".badge" })).toHaveLength(10);
    expect(screen.getByText(/show more \(2 remaining\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/show more/i));
    expect(screen.getAllByText("Locked", { selector: ".badge" })).toHaveLength(12);
    expect(screen.queryByText(/show more/i)).not.toBeInTheDocument();
  });
});
