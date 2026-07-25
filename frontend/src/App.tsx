import { EscrowForm } from "./components/EscrowForm";
import { EscrowList } from "./components/EscrowList";
import { WalletConnect } from "./components/WalletConnect";
import { useEscrows } from "./hooks/useEscrows";
import { useWallet } from "./hooks/useWallet";

export function App() {
  const wallet = useWallet();
  const {
    escrows,
    loading,
    error,
    createEscrow,
    releaseEscrow,
    refundEscrow,
    resolveEscrow,
  } = useEscrows();

  return (
    <>
      <header className="app-header">
        <div>
          <h1>StellarVault</h1>
          <p>
            Trustless milestone escrow for freelance work on Cardano Preprod.
            Funds only move when the buyer, seller, or arbiter signs — see
            the validator in <code>contracts/</code>.
          </p>
        </div>
        <WalletConnect wallet={wallet} />
      </header>

      {error && <div className="error-banner">{error}</div>}

      <EscrowForm
        onCreate={createEscrow}
        defaultBuyerAddress={wallet.address ?? undefined}
      />

      <section style={{ marginTop: "2rem" }}>
        <h2 className="section-title">Escrows</h2>
        <EscrowList
          escrows={escrows}
          loading={loading}
          onRelease={releaseEscrow}
          onRefund={refundEscrow}
          onResolve={resolveEscrow}
        />
      </section>
    </>
  );
}
