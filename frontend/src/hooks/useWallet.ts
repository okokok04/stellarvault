import { useCallback, useMemo, useState } from "react";
import type { Cip30WalletApi } from "../types/cip30";

export interface WalletState {
  availableWallets: string[];
  connectedWallet: string | null;
  address: string | null;
  connecting: boolean;
  error: string | null;
  connect: (walletKey: string) => Promise<void>;
  disconnect: () => void;
}

/// CIP-30 wallet connection. StellarVault only needs the wallet's first
/// used address (to prove control over buyer/seller/arbiter roles when
/// creating an escrow) — signing transactions happens server-side today,
/// so we never request `signTx` here.
export function useWallet(): WalletState {
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableWallets = useMemo(() => {
    if (typeof window === "undefined" || !window.cardano) return [];
    return Object.keys(window.cardano);
  }, []);

  const connect = useCallback(async (walletKey: string) => {
    setConnecting(true);
    setError(null);
    try {
      const provider = window.cardano?.[walletKey];
      if (!provider) {
        throw new Error(`Wallet "${walletKey}" is not installed`);
      }

      const api: Cip30WalletApi = await provider.enable();
      const usedAddresses = await api.getUsedAddresses();
      const unusedAddresses = usedAddresses.length
        ? []
        : await api.getUnusedAddresses();
      const [firstAddress] = usedAddresses.length
        ? usedAddresses
        : unusedAddresses;

      if (!firstAddress) {
        throw new Error(
          "Wallet has no addresses yet — fund it from the Preprod faucet first",
        );
      }

      setConnectedWallet(walletKey);
      setAddress(firstAddress);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
      setConnectedWallet(null);
      setAddress(null);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnectedWallet(null);
    setAddress(null);
    setError(null);
  }, []);

  return {
    availableWallets,
    connectedWallet,
    address,
    connecting,
    error,
    connect,
    disconnect,
  };
}
