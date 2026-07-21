/**
 * eHealth - Blood & Organ Match Service
 * ABO/Rh compatibility matrix + organ matching algorithm
 */

// ============================================================
// ABO/Rh Blood Type Compatibility Matrix
// Key: recipient blood type â†’ array of compatible donor types
// ============================================================
const BLOOD_COMPATIBILITY = {
  'O-':  ['O-'],
  'O+':  ['O-', 'O+'],
  'A-':  ['O-', 'A-'],
  'A+':  ['O-', 'O+', 'A-', 'A+'],
  'B-':  ['O-', 'B-'],
  'B+':  ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
};

// Urgency multiplier for scoring
const URGENCY_WEIGHT = { critical: 1.5, urgent: 1.2, moderate: 1.0 };

/**
 * Check if donor blood type is compatible with recipient
 * @param {string} donorType - e.g. 'O-'
 * @param {string} recipientType - e.g. 'A+'
 * @returns {boolean}
 */
function isBloodCompatible(donorType, recipientType) {
  const compatibleDonors = BLOOD_COMPATIBILITY[recipientType];
  if (!compatibleDonors) return false;
  return compatibleDonors.includes(donorType);
}

/**
 * Calculate blood match score (0-100)
 */
function bloodMatchScore(donorType, recipientType) {
  if (!isBloodCompatible(donorType, recipientType)) return 0;
  // Exact match scores higher
  if (donorType === recipientType) return 100;
  // O- universal donor scores slightly lower (more rare/precious)
  if (donorType === 'O-') return 85;
  return 90;
}

/**
 * Calculate organ compatibility score (0-100)
 * Simplified model: blood type compatibility + organ type match
 */
function organMatchScore(donor, recipientRequest) {
  const bloodScore = bloodMatchScore(donor.blood_type, recipientRequest.blood_type_needed);
  if (bloodScore === 0) return 0;

  // Check if donor has pledged the needed organ
  const organPledges = donor.donor_profile?.organ_pledges || [];
  const organNeeded = recipientRequest.organ_needed;

  if (!organNeeded || !organPledges.includes(organNeeded)) return 0;

  return Math.round(bloodScore * 0.8 + 20); // Blood compat 80% weight + organ pledge 20%
}

/**
 * Find compatible donors for a recipient request
 * @param {object} recipientRequest - { request_type, blood_type_needed, organ_needed, urgency_level }
 * @param {Array} donors - Array of donor user objects with donor_profile embedded
 * @returns {Array} Sorted array of { donor, score, compatible }
 */
function findMatches(recipientRequest, donors) {
  const urgencyMultiplier = URGENCY_WEIGHT[recipientRequest.urgency_level] || 1.0;

  const results = donors
    .filter(d => d.donor_profile?.availability_status === 'available')
    .map(donor => {
      let score = 0;

      if (recipientRequest.request_type === 'blood') {
        score = bloodMatchScore(donor.blood_type, recipientRequest.blood_type_needed);
      } else if (recipientRequest.request_type === 'organ') {
        score = organMatchScore(donor, recipientRequest);
      }

      const weightedScore = Math.min(100, Math.round(score * urgencyMultiplier));

      return {
        donor,
        rawScore: score,
        compatibilityScore: weightedScore,
        compatible: score > 0
      };
    })
    .filter(r => r.compatible)
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  return results;
}

/**
 * Get blood type compatibility info (for UI display)
 */
function getCompatibleDonorTypes(recipientType) {
  return BLOOD_COMPATIBILITY[recipientType] || [];
}

module.exports = {
  isBloodCompatible,
  bloodMatchScore,
  organMatchScore,
  findMatches,
  getCompatibleDonorTypes,
  BLOOD_COMPATIBILITY
};
