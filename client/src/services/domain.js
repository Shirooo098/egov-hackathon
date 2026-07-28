export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const ALL_ORGANS = ['kidney', 'liver', 'cornea', 'heart', 'lung', 'pancreas'];
export const ORGANS = ALL_ORGANS; // Synonym for recipient views

export const STATIC_MATCHES = [
  { id: 'match-pgh-002', donor: 'Rosa Magtanggol', recipient: 'Carlos Santos', type: 'organ', organ: 'Liver', match: 'AB- → AB-', urgency: 'critical', score: 96, status: 'pending_hospital_approval' },
  { id: 'match-pgh-003', donor: 'Pedro Reyes', recipient: 'Luz Garcia', type: 'blood', organ: 'Whole Blood', match: 'A+ → A+', urgency: 'moderate', score: 92, status: 'approved' },
];

export const URGENCY_BADGES = { critical: 'badge-critical', urgent: 'badge-urgent', moderate: 'badge-moderate' };
export const URGENCY_LABELS = { critical: 'Critical', urgent: 'Urgent', moderate: 'Moderate' };
export const U_BADGE = URGENCY_BADGES;
export const U_LABEL = URGENCY_LABELS;

export const getLiveMatchAsItem = (match) => ({
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
  anchor: match.blockchainAnchor
});

export const getLiveMatchAsCase = getLiveMatchAsItem;

export const filterMatches = (allMatches) => ({
  pendingMatches: allMatches.filter(m => m.status === 'pending_hospital_approval'),
  activeMatches: allMatches.filter(m => m.status !== 'pending_hospital_approval' && m.status !== 'rejected'),
  rejectedMatches: allMatches.filter(m => m.status === 'rejected'),
  // Aliases for compatibility during transition
  pendingCases: allMatches.filter(m => m.status === 'pending_hospital_approval'),
  activeCases: allMatches.filter(m => m.status !== 'pending_hospital_approval' && m.status !== 'rejected'),
  rejectedCases: allMatches.filter(m => m.status === 'rejected'),
});

export const filterCases = filterMatches;

export const generateScheduleSlots = (type, urgency, startDate, endDate) => {
  const slots = [];
  const slotCount = type === 'organ' ? 3 : 5;

  for (let i = 0; i < slotCount; i++) {
    const dayOffset = Math.floor(Math.random() * 30) + 1;
    const slotDate = new Date(startDate);
    slotDate.setDate(slotDate.getDate() + dayOffset);

    if (slotDate > endDate) continue;

    const hour = [8, 9, 10, 13, 14, 15][Math.floor(Math.random() * 6)];
    const minute = [0, 30][Math.floor(Math.random() * 2)];
    slotDate.setHours(hour, minute, 0, 0);

    const hospitals = type === 'organ'
      ? ['PGH - Organ Transplant Unit', 'St. Luke\'s BGC - Transplant Center', 'NKTI - Kidney Transplant', 'Heart Center - Cardiothoracic']
      : ['Philippine Red Cross - Blood Center', 'PGH - Blood Bank', 'St. Luke\'s - Apheresis Unit', 'RITM - Blood Services'];

    const hospital = hospitals[Math.floor(Math.random() * hospitals.length)];

    slots.push({
      id: `slot-${type}-${i}-${Date.now()}`,
      start: slotDate.toISOString(),
      end: new Date(slotDate.getTime() + (type === 'organ' ? 3 : 1.5) * 60 * 60 * 1000).toISOString(),
      type: type === 'organ' ? 'Tri-party Surgical Consultation' : 'Blood Donation & Compatibility Verification',
      location: hospital,
      notes: `${type === 'organ' ? 'Surgeon + Anesthesiologist + Transplant Coordinator' : 'Phlebotomist + Pathologist + Recipient Coordinator'} · ${urgency ? (urgency.charAt(0).toUpperCase() + urgency.slice(1)) : 'Urgent'} Priority`,
      status: i === 0 ? 'recommended' : 'available',
      matchType: type
    });
  }

  return slots.sort((a, b) => new Date(a.start) - new Date(b.start));
};

export const generateDonorSlots = (type, startDate, endDate) => {
  return generateScheduleSlots(type, 'urgent', startDate, endDate);
};

export const validateRecipientParams = (params) => {
  const newErrors = {};
  if (!params.request_type) newErrors.request_type = 'Request type is required';
  if (!params.blood_type_needed) newErrors.blood_type_needed = 'Blood type is required';
  if (params.request_type === 'organ' && !params.organ_needed) newErrors.organ_needed = 'Organ type is required';
  return newErrors;
};
