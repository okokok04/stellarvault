/// StellarVault milestone escrow validator.
///
/// This is the privacy-critical core of the product: the on-chain rule
/// that funds locked at the script address can *only* leave under one of
/// three conditions, each requiring the correct party's signature. No
/// off-chain service, API, or UI can bypass this — the guarantee holds
/// even if the backend in `backend/` is fully compromised.
///
/// Spend paths:
///   - Release  : buyer signs, seller is paid in full.
///   - Refund   : buyer signs after the deadline, buyer reclaims funds.
///   - Resolve  : arbiter signs, directs funds to either side.

use cardano/transaction.{OutputReference, Transaction}
use stellar_vault/types.{EscrowDatum, EscrowRedeemer, Refund, Release, Resolve}
use stellar_vault/utils.{deadline_passed, paid_at_least, signed_by}

validator escrow {
  spend(
    datum: Option<EscrowDatum>,
    redeemer: EscrowRedeemer,
    _own_ref: OutputReference,
    self: Transaction,
  ) {
    expect Some(EscrowDatum {
      buyer,
      seller,
      arbiter,
      milestone_amount,
      deadline,
    }) = datum

    when redeemer is {
      Release ->
        signed_by(self, buyer) && paid_at_least(
          self.outputs,
          seller,
          milestone_amount,
        )

      Refund -> signed_by(self, buyer) && deadline_passed(self, deadline)

      Resolve { pay_seller } -> {
        let payee = if pay_seller {
          seller
        } else {
          buyer
        }
        signed_by(self, arbiter) && paid_at_least(
          self.outputs,
          payee,
          milestone_amount,
        )
      }
    }
  }

  else(_) {
    fail
  }
}
