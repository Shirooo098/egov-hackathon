// One helper for every simulated notification toast in the demo.
//
// Usage:
//   import { eMessageToast } from '../utils/eMessageToast';
//   eMessageToast(toast, 'approved', { recipient: 'Ana Reyes' });

const KIND_TONE: Record<string, { method: 'success' | 'warning' | 'info'; title: string; duration: number }> = {
  approved: {
    method: "success",
    title: "Demo review completed",
    duration: 7000,
  },
  rejected: { method: "warning", title: "Demo match declined", duration: 6000 },
  schedule_proposed: { method: "info", title: "Date proposed", duration: 7000 },
  counter_proposed: {
    method: "info",
    title: "A new date was suggested",
    duration: 7000,
  },
  scheduled: {
    method: "success",
    title: "Demo appointment saved",
    duration: 7000,
  },
  agreement_signed: {
    method: "success",
    title: "Demo agreement action saved",
    duration: 7000,
  },
  chat_message: { method: "info", title: "New message", duration: 6000 },
};
type ToastApi = { success: (message: string, options?: { title?: string; duration?: number }) => number; warning: ToastApi['success']; info: ToastApi['success'] };
type ToastKind = keyof typeof KIND_TONE;
type ToastContext = { donor?: string; recipient?: string; date?: string; time?: string; location?: string; other?: string };

// kind: one of the keys above
// ctx: { recipient, donor, recipientName, date, time, location, other }
export function eMessageToast(toast: ToastApi | null | undefined, kind: ToastKind, ctx: ToastContext = {}) {
  if (!toast || !KIND_TONE[kind]) return;
  const tone = KIND_TONE[kind];
  const message = composeMessage(kind, ctx);
  setTimeout(() => {
    toast[tone.method](message, { title: tone.title, duration: tone.duration });
  }, 100);
}

function composeMessage(kind: ToastKind, ctx: ToastContext): string {
  const donor = ctx.donor || "your donor";
  switch (kind) {
    case "approved":
      return `The hospital review demo approved your match with ${donor}. You can now pick a date in this prototype.`;
    case "rejected":
      return `This demo match was marked declined. No new match search has started.`;
    case "schedule_proposed":
      return `Demo suggestion: ${ctx.date || "a date"} at ${ctx.time || "a time"} (${ctx.location || "the hospital"}). Review it here to confirm.`;
    case "counter_proposed":
      return `${donor} suggested ${ctx.date || "a new date"} at ${ctx.time || "a new time"}. Review it here.`;
    case "scheduled":
      return `The demo schedule is saved for ${ctx.date || "your date"} at ${ctx.time || "your time"} at ${ctx.location || "the hospital"}.`;
    case "agreement_signed":
      return `Both demo signature actions are recorded. You can now chat with ${donor} in the prototype.`;
    case "chat_message":
      return `A simulated notification says you have a new message from your match.`;
    default:
      return "";
  }
}
