export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
export const ALL_ORGANS = [
  "kidney",
  "liver",
  "cornea",
  "heart",
  "lung",
  "pancreas",
];

export interface MatchItem {
  id: string;
  donor: string;
  recipient: string;
  type: string;
  organ: string;
  match: string;
  urgency: string;
  score: number;
  status: string;
  [key: string]: unknown;
}
export interface LiveMatch {
  id: string;
  matchType: string;
  organ: string;
  compatibilityScore: number;
  urgencyLevel: string;
  status: string;
  donor: {
    first_name: string;
    last_name: string;
    blood_type: string;
    [key: string]: unknown;
  };
  recipient: {
    first_name: string;
    last_name: string;
    blood_type_needed: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
export const getLiveMatchAsItem = (match: LiveMatch): MatchItem => ({
  id: match.id,
  donor: `${match.donor.first_name} ${match.donor.last_name}`,
  recipient: `${match.recipient.first_name} ${match.recipient.last_name}`,
  type: match.matchType,
  organ: match.organ,
  match: `${match.donor.blood_type} → ${match.recipient.blood_type_needed}`,
  urgency: match.urgencyLevel,
  score: match.compatibilityScore,
  status: match.status,
  isLiveContext: true,
  anchor: match.blockchainAnchor,
});

export const filterMatches = (allMatches: MatchItem[]) => ({
  pendingMatches: allMatches.filter(
    (m: MatchItem) => m.status === "pending_hospital_approval",
  ),
  activeMatches: allMatches.filter(
    (m: MatchItem) =>
      m.status !== "pending_hospital_approval" && m.status !== "rejected",
  ),
  rejectedMatches: allMatches.filter((m: MatchItem) => m.status === "rejected"),
});
