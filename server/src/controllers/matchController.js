const { findMatches, getCompatibleDonorTypes, BLOOD_COMPATIBILITY } = require('../services/MatchService');

// Demo donors data for hackathon
const DEMO_DONORS = [
  { id: '22222222-2222-2222-2222-222222222222', first_name: 'Juan', last_name: 'Dela Cruz', blood_type: 'O-', location_city: 'Quezon City', everify_status: 'verified',
    donor_profile: { organ_pledges: ['kidney', 'cornea'], availability_status: 'available', is_blood_donor: true, age: 32 } },
  { id: 'aaa-donor-2', first_name: 'Pedro', last_name: 'Reyes', blood_type: 'A+', location_city: 'Pasig City', everify_status: 'verified',
    donor_profile: { organ_pledges: ['liver'], availability_status: 'available', is_blood_donor: true, age: 27 } },
  { id: 'aaa-donor-3', first_name: 'Lito', last_name: 'Garcia', blood_type: 'B+', location_city: 'Manila', everify_status: 'verified',
    donor_profile: { organ_pledges: [], availability_status: 'available', is_blood_donor: true, age: 45 } },
  { id: 'aaa-donor-4', first_name: 'Rosa', last_name: 'Magtanggol', blood_type: 'AB-', location_city: 'Mandaluyong', everify_status: 'verified',
    donor_profile: { organ_pledges: ['kidney', 'liver'], availability_status: 'available', is_blood_donor: false, age: 35 } }
];

async function getMatches(req, res, next) {
  try {
    const { request_type, blood_type_needed, organ_needed, urgency_level } = req.query;
    if (!request_type || !blood_type_needed) {
      return res.status(400).json({ success: false, message: 'request_type and blood_type_needed are required' });
    }
    const recipientRequest = { request_type, blood_type_needed, organ_needed, urgency_level: urgency_level || 'moderate' };
    const matches = findMatches(recipientRequest, DEMO_DONORS);
    res.json({
      success: true,
      data: { matches, totalFound: matches.length, request: recipientRequest }
    });
  } catch (err) { next(err); }
}

async function getCompatibility(req, res, next) {
  try {
    const { blood_type } = req.params;
    const compatible = getCompatibleDonorTypes(blood_type);
    res.json({ success: true, data: { blood_type, compatible_donor_types: compatible } });
  } catch (err) { next(err); }
}

async function getMatrix(req, res, next) {
  res.json({ success: true, data: BLOOD_COMPATIBILITY });
}

module.exports = { getMatches, getCompatibility, getMatrix };
