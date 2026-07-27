import { EscrowForm } from "./components/EscrowForm";
import { EscrowList } from "./components/EscrowList";
import { FeedbackForm } from "./components/FeedbackForm";
import { FeedbackList } from "./components/FeedbackList";
import { StatsBar } from "./components/StatsBar";
import { WalletConnect } from "./components/WalletConnect";
import { useEscrows } from "./hooks/useEscrows";
import { useFeedback } from "./hooks/useFeedback";
import { useStats } from "./hooks/useStats";
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
  const {
    feedback,
    loading: feedbackLoading,
    submitFeedback,
    updateStatus,
    removeFeedback,
  } = useFeedback();
  const { stats, loading: statsLoading } = useStats();

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

      <StatsBar stats={stats} loading={statsLoading} />

      {error && <div className="error-banner" role="alert">{error}</div>}

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

      <section style={{ marginTop: "2rem" }}>
        <FeedbackForm onSubmit={submitFeedback} />
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2 className="section-title">Recent feedback</h2>
        <FeedbackList
          feedback={feedback}
          loading={feedbackLoading}
          onUpdateStatus={updateStatus}
          onRemove={removeFeedback}
        />
      </section>
    </>
  );
}
