/// Minimal CIP-30 typings for the subset of the wallet API StellarVault
/// actually uses. The full spec exposes more (collateral, data signing,
/// balance in raw CBOR); we only need enough to connect a wallet and
/// read its first used address.

export interface Cip30WalletApi {
  getUsedAddresses(): Promise<string[]>;
  getUnusedAddresses(): Promise<string[]>;
  getNetworkId(): Promise<number>;
}

export interface Cip30WalletProvider {
  name: string;
  icon: string;
  apiVersion: string;
  isEnabled(): Promise<boolean>;
  enable(): Promise<Cip30WalletApi>;
}

declare global {
  interface Window {
    cardano?: Record<string, Cip30WalletProvider>;
  }
}
