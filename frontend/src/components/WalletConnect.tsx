import type { WalletState } from "../hooks/useWallet";

function shorten(address: string): string {
  return address.length > 20
    ? `${address.slice(0, 10)}…${address.slice(-6)}`
    : address;
}

export function WalletConnect({ wallet }: { wallet: WalletState }) {
  if (wallet.address) {
    return (
      <div className="wallet-select">
        <span className="badge badge-resolved">{wallet.connectedWallet}</span>
        <code className="hash">{shorten(wallet.address)}</code>
        <button onClick={wallet.disconnect}>Disconnect</button>
      </div>
    );
  }

  if (wallet.availableWallets.length === 0) {
    return (
      <div className="wallet-select">
        <span className="empty-state">
          No CIP-30 wallet detected. Install{" "}
          <a href="https://eternl.io" target="_blank" rel="noreferrer">
            Eternl
          </a>{" "}
          or{" "}
          <a href="https://lace.io" target="_blank" rel="noreferrer">
            Lace
          </a>{" "}
          and switch it to Preprod.
        </span>
      </div>
    );
  }

  return (
    <div className="wallet-select">
      {wallet.availableWallets.map((key) => (
        <button
          key={key}
          className="primary"
          disabled={wallet.connecting}
          onClick={() => void wallet.connect(key)}
        >
          Connect {key}
        </button>
      ))}
      {wallet.error && <span className="error-banner" role="alert">{wallet.error}</span>}
    </div>
  );
}
