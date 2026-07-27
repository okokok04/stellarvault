import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WalletConnect } from "./WalletConnect";
import type { WalletState } from "../hooks/useWallet";

function makeWalletState(overrides: Partial<WalletState> = {}): WalletState {
  return {
    availableWallets: [],
    connectedWallet: null,
    address: null,
    connecting: false,
    error: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  };
}

describe("WalletConnect", () => {
  it("prompts to install a wallet when none is detected", () => {
    render(<WalletConnect wallet={makeWalletState()} />);
    expect(screen.getByText(/no cip-30 wallet detected/i)).toBeInTheDocument();
  });

  it("offers a connect button per detected wallet and calls connect on click", () => {
    const connect = vi.fn();
    render(
      <WalletConnect
        wallet={makeWalletState({ availableWallets: ["eternl", "lace"], connect })}
      />,
    );

    expect(screen.getByText("Connect eternl")).toBeInTheDocument();
    expect(screen.getByText("Connect lace")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Connect eternl"));
    expect(connect).toHaveBeenCalledWith("eternl");
  });

  it("shows the connection error when present", () => {
    render(
      <WalletConnect
        wallet={makeWalletState({
          availableWallets: ["eternl"],
          error: "User declined the connection",
        })}
      />,
    );
    expect(screen.getByText("User declined the connection")).toBeInTheDocument();
  });

  it("shows the connected address and disconnects on click", () => {
    const disconnect = vi.fn();
    render(
      <WalletConnect
        wallet={makeWalletState({
          connectedWallet: "eternl",
          address: "addr_test1qzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
          disconnect,
        })}
      />,
    );

    expect(screen.getByText("eternl")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Disconnect"));
    expect(disconnect).toHaveBeenCalled();
  });
});
