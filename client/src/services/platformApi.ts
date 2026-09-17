import { api } from "./api";
type Payload = Record<string, unknown>;
type Query = Record<string, string | number | boolean | undefined>;

export const INTAKE_ORGANS = Object.freeze([
  "kidney",
  "liver",
  "heart",
  "lung",
  "pancreas",
]);

export function recipientIntakePayload(form: Record<string, unknown>): Payload {
  return {
    requestType: form.request_type,
    declaredBloodGroup: form.blood_type_needed,
    requestedOrgan: form.request_type === "organ" ? form.organ_needed : null,
    urgency: form.urgency_level === "moderate" ? "routine" : form.urgency_level,
    state: "active",
  };
}

export function donorIntakePayload(form: Record<string, unknown>): Payload {
  return {
    declaredBloodGroup: form.bloodType,
    pledgedOrgans: [
      ...new Set(
        (Array.isArray(form.organs) ? form.organs : []).filter(
          (organ): organ is string =>
            typeof organ === "string" && INTAKE_ORGANS.includes(organ),
        ),
      ),
    ],
    bloodDonor: form.isBlood,
    availability: form.availability || "available",
    state: "active",
  };
}

export const platformApi = {
  services: () => api.request("/platform/services"),
  cases: () => api.request("/platform/cases"),
  createCase: (body: Payload) =>
    api.request("/platform/cases", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  intake: (episodeId: string) =>
    api.request(`/platform/episodes/${episodeId}/intake`),
  saveIntake: (episodeId: string, body: Payload) =>
    api.request(`/platform/episodes/${episodeId}/intake`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  episode: (id: string) => api.request(`/platform/episodes/${id}`),
  episodeAction: (id: string, action: string, version: number) =>
    api.request(`/platform/episodes/${id}/${action}`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),
  conversations: () => api.request("/platform/conversations"),
  messages: (id: string) =>
    api.request(`/platform/conversations/${id}/messages`),
  sendMessage: (id: string, body: string) =>
    api.request(`/platform/conversations/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  notifications: () => api.request("/platform/notifications"),
  slots: (params = {}) =>
    api.request(
      `/hospital/slots${Object.keys(params).length ? `?${new URLSearchParams(params)}` : ""}`,
    ),
  appointmentRequests: (body: Payload) =>
    api.request("/appointments/requests", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  appointmentRequestsList: () => api.request("/appointments/requests"),
  bookings: () => api.request("/bookings"),
  candidates: (params: Query = {}) =>
    api.request(
      `/hospital/candidates${
        Object.keys(params).length
          ? `?${new URLSearchParams(
              Object.entries(params)
                .filter((entry) => entry[1] !== undefined)
                .map(([k, v]) => [k, String(v)]),
            )}`
          : ""
      }`,
    ),
  reviewers: (serviceId?: string) =>
    api.request(
      `/hospital/reviewers${serviceId ? `?serviceId=${encodeURIComponent(serviceId)}` : ""}`,
    ),
  deceasedOffers: () => api.request("/hospital/deceased-offers"),
  selectCandidate: (id: string, body: Payload) =>
    api.request(`/hospital/candidates/${id}/select`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  currentPair: () => api.request("/pairs/current"),
  pair: (id: string) => api.request(`/pairs/${id}`),
  respondToPair: (id: string, body: Payload) =>
    api.request(`/pairs/${id}/respond`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  pairMessages: (id: string, params: Query = {}) =>
    api.request(
      `/pairs/${id}/messages${
        Object.keys(params).length
          ? `?${new URLSearchParams(
              Object.entries(params)
                .filter((entry) => entry[1] !== undefined)
                .map(([k, v]) => [k, String(v)]),
            )}`
          : ""
      }`,
    ),
  sendPairMessage: (id: string, body: Payload) =>
    api.request(`/pairs/${id}/messages`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  closePairConversation: (id: string, body?: Payload) =>
    api.request(`/pairs/${id}/messages/close`, {
      method: "POST",
      body: JSON.stringify(body || {}),
    }),
  scheduleProposals: (id: string, body?: Payload) =>
    body === undefined
      ? api.request(`/pairs/${id}/schedule-proposals`)
      : api.request(`/pairs/${id}/schedule-proposals`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
  respondToSchedule: (id: string, proposalId: string, body: Payload) =>
    api.request(`/pairs/${id}/schedule-proposals/${proposalId}/respond`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resetSyntheticFixtures: (confirmation = "RESET_SYNTHETIC_DATA") =>
    api.operations.reset(confirmation),
};
