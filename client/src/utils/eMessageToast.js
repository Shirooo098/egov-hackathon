// One helper for every DICT eMessage SMS toast fired by MatchContext.
// Keeps title, duration, and SMS prefix consistent.
//
// Usage:
//   import { eMessageToast } from '../utils/eMessageToast';
//   eMessageToast(toast, 'approved', { recipient: 'Ana Reyes' });

const KIND_TONE = {
  approved:          { method: 'success', title: 'You are approved ✓',                       duration: 7000 },
  rejected:          { method: 'warning', title: 'Looking for another match',                duration: 6000 },
  schedule_proposed: { method: 'info',    title: 'Date proposed',                            duration: 7000 },
  counter_proposed:  { method: 'info',    title: 'A new date was suggested',                 duration: 7000 },
  scheduled:         { method: 'success', title: 'Appointment confirmed',                    duration: 7000 },
  agreement_signed:  { method: 'success', title: 'Agreement signed',                        duration: 7000 },
  chat_message:      { method: 'info',    title: 'New message',                              duration: 6000 },
};

// kind: one of the keys above
// ctx: { recipient, donor, recipientName, date, time, location, other }
export function eMessageToast(toast, kind, ctx = {}) {
  if (!toast || !KIND_TONE[kind]) return;
  const tone = KIND_TONE[kind];
  const message = composeMessage(kind, ctx);
  setTimeout(() => {
    toast[tone.method](message, { title: tone.title, duration: tone.duration });
  }, 100);
}

function composeMessage(kind, ctx) {
  const donor = ctx.donor || 'your donor';
  switch (kind) {
    case 'approved':
      return `Good news — the hospital approved your match with ${donor}. You can now pick a date together.`;
    case 'rejected':
      return `This match didn't work out. We're looking for another one for you.`;
    case 'schedule_proposed':
      return `Suggested: ${ctx.date || 'a date'} at ${ctx.time || 'a time'} (${ctx.location || 'the hospital'}). Tap to confirm.`;
    case 'counter_proposed':
      return `${donor} suggested ${ctx.date || 'a new date'} at ${ctx.time || 'a new time'}. Tap to review.`;
    case 'scheduled':
      return `You're all set for ${ctx.date || 'your date'} at ${ctx.time || 'your time'} at ${ctx.location || 'the hospital'}.`;
    case 'agreement_signed':
      return `Both of you signed. You can now chat directly with ${donor}.`;
    case 'chat_message':
      return `You have a new message from your match.`;
    default:
      return '';
  }
}
