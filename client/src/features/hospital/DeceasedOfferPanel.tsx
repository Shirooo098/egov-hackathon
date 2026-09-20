import { useEffect, useState } from "react";
import { platformApi } from "../../services/platformApi";

type Offer = {
  id: string;
  organ?: string;
  sourceDeadline?: string;
  status?: string;
  externalReference?: string;
  assignedReviewerName?: string | null;
  approvedSummary?: string | null;
};

export default function DeceasedOfferPanel() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (typeof platformApi.deceasedOffers !== "function")
      return () => {
        active = false;
      };
    platformApi
      .deceasedOffers()
      .then((response) => {
        const data = response?.data as
          | { items?: Offer[] }
          | Offer[]
          | undefined;
        const items = Array.isArray(data) ? data : data?.items;
        if (active) setOffers(Array.isArray(items) ? items : []);
      })
      .catch(
        () => active && setError("Deceased-organ offers are unavailable."),
      );
    return () => {
      active = false;
    };
  }, []);
  return (
    <section
      className="card hospital-deceased-offers"
      aria-labelledby="deceased-offers-heading"
    >
      <h2 id="deceased-offers-heading">Synthetic deceased-organ offers</h2>
      <p>
        Coordination records only. These simulated offers are not allocations or
        clinical decisions.
      </p>
      {error && <p role="alert">{error}</p>}
      {!error && offers.length === 0 && (
        <p role="status">No deceased-organ offers are currently available.</p>
      )}
      {offers.map((offer) => (
        <article key={offer.id} className="candidate-row">
          <h3>
            {offer.organ || "Organ"} · {offer.status || "pending"}
          </h3>
          {offer.sourceDeadline && (
            <p>Response deadline: {offer.sourceDeadline}</p>
          )}
          {offer.externalReference && (
            <small>Reference: {offer.externalReference}</small>
          )}
          {offer.assignedReviewerName && (
            <p>Assigned reviewer: {offer.assignedReviewerName}</p>
          )}
          {offer.approvedSummary && (
            <p>Approved review summary: {offer.approvedSummary}</p>
          )}
        </article>
      ))}
    </section>
  );
}
