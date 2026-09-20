import "../../styles/components/match/BlockchainBadge.css";

type Props = {
  matchId?: string;
  donorId?: string;
  recipientId?: string;
  signerRole?: "recipient" | "donor";
  consentSigned?: boolean;
  onConsentSuccess?: () => void;
};

export default function BlockchainBadge(_props: Props) {
  return (
    <div className="card blockchain-badge-card">
      <div className="blockchain-badge-row">
        <div className="icon-badge icon-badge-lg icon-badge-navy">◆</div>
        <div>
          <div className="blockchain-badge-title">Consent proof status</div>
          <div className="blockchain-badge-description">
            Consent is recorded by the authenticated server workflow. This
            legacy panel cannot create signatures or blockchain receipts.
          </div>
        </div>
      </div>
      <p role="status">
        Use the case or pair consent controls to submit a grant or withdrawal.
        Proof remains pending until the server reports a staging receipt.
      </p>
    </div>
  );
}
