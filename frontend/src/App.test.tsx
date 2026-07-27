import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

function mockFetchJson(path: string) {
  if (path.endsWith("/escrows")) return [];
  if (path.endsWith("/feedback")) return [];
  if (path.endsWith("/stats")) {
    return {
      totalEscrows: 0,
      escrowsByStatus: {},
      totalLovelaceLocked: 0,
      totalFeedback: 0,
      averageRating: null,
    };
  }
  throw new Error(`unexpected fetch: ${path}`);
}

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        return {
          ok: true,
          json: async () => mockFetchJson(url),
        } as Response;
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the header, forms, and empty-state lists once data loads", async () => {
    render(<App />);

    expect(screen.getByText("StellarVault")).toBeInTheDocument();
    expect(screen.getByText("New milestone escrow")).toBeInTheDocument();
    expect(screen.getByText("Leave feedback")).toBeInTheDocument();

    expect(
      await screen.findByText(/no escrows yet/i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/no feedback yet/i)).toBeInTheDocument();
  });
});
