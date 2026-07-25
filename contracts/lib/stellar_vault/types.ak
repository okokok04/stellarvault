/// Core datum and redeemer types for the StellarVault milestone escrow.
///
/// The datum is intentionally minimal: only the three parties and the
/// numbers needed to authorize a spend live on-chain. Anything about
/// *why* a milestone was approved (scope, deliverables, messages) stays
/// off-chain — the validator only ever needs to know *who* can move
/// funds and *under what condition*.

/// One escrow covers a single milestone payment between a buyer and a
/// seller, with an arbiter who can only act as a tie-breaker.
pub type EscrowDatum {
  buyer: ByteArray,
  seller: ByteArray,
  arbiter: ByteArray,
  milestone_amount: Int,
  deadline: Int,
}

/// The three ways funds locked in an escrow UTxO can move.
pub type EscrowRedeemer {
  /// Buyer signs off that the milestone was delivered; seller is paid.
  Release
  /// Buyer reclaims funds once the deadline has passed with no release.
  Refund
  /// Arbiter breaks a deadlock and directs funds to one side.
  Resolve { pay_seller: Bool }
}
