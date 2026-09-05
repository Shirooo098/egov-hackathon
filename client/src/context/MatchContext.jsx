import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useToast } from './ToastContext';
import { api } from '../services/api';
import { eMessageToast } from '../utils/eMessageToast';
import {
  INITIAL_DEMO_MATCH,
  MATCH_STORAGE_KEY,
  getInitialMatch,
  saveMatchToStorage,
  clearMatchFromStorage,
  clearStaticMatchesFromStorage,
  parseStorageEventValue,
  calculateUpdatedMatchFromProfile,
} from './matchHelpers.js';

const MatchContext = createContext(null);

export function MatchProvider({ children }) {
  const [match, setMatch] = useState(() => getInitialMatch());
  const toast = useToast();

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === MATCH_STORAGE_KEY) {
        const updated = parseStorageEventValue(e.newValue);
        setMatch(updated);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const advanceStatus = useCallback((newStatus) => {
    setMatch((prev) => {
      const updated = { ...prev, status: newStatus };
      saveMatchToStorage(updated);

      // Emit simulated DICT eMessage push notifications on state transitions (Issue #010).
      // All copy is centralized in utils/eMessageToast.js — see that file for the templates.
      const donorName = `${prev.donor.first_name} ${prev.donor.last_name}`;
      const recipientName = `${prev.recipient.first_name} ${prev.recipient.last_name}`;
      if (newStatus === 'approved') {
        eMessageToast(toast, 'approved', { recipient: recipientName, donor: donorName });
      } else if (newStatus === 'rejected') {
        eMessageToast(toast, 'rejected', {});
      } else if (newStatus === 'waiting_donor_confirmation') {
        eMessageToast(toast, 'schedule_proposed', { recipient: recipientName });
      } else if (newStatus === 'waiting_recipient_confirmation') {
        eMessageToast(toast, 'counter_proposed', { donor: donorName });
      } else if (newStatus === 'scheduled') {
        eMessageToast(toast, 'scheduled', {
          date: prev.scheduledDate,
          time: prev.scheduledTime,
          location: prev.scheduledLocation || prev.hospital.name,
        });
      } else if (newStatus === 'agreement_finalized' || newStatus === 'contract_signed') {
        eMessageToast(toast, 'agreement_signed', {});
      }

      return updated;
    });
  }, [toast]);

  const proposeSchedule = useCallback(({ date, time, location, proposedBy }) => {
    setMatch((prev) => {
      const isDonor = proposedBy === 'donor' || proposedBy === 'Donor';
      const nextStatus = isDonor ? 'waiting_recipient_confirmation' : 'waiting_donor_confirmation';
      const kind = isDonor ? 'counter_proposed' : 'schedule_proposed';
      eMessageToast(toast, kind, { date, time, location });
      const updated = {
        ...prev,
        proposedSchedule: { date, time, location, proposedBy },
        status: nextStatus,
      };
      saveMatchToStorage(updated);
      return updated;
    });
  }, [toast]);

  const setScheduledDate = useCallback((date, time = '10:00 AM', location = 'Philippine General Hospital (PGH)') => {
    setMatch((prev) => {
      const updated = {
        ...prev,
        scheduledDate: date,
        scheduledTime: time,
        scheduledLocation: location,
        proposedSchedule: { date, time, location, confirmed: true },
        status: 'scheduled',
      };
      saveMatchToStorage(updated);
      return updated;
    });
    eMessageToast(toast, 'scheduled', { date, time, location });
  }, [toast]);

  const anchorToBlockchain = useCallback(async (customAnchorData = null) => {
    if (customAnchorData) {
      setMatch((prev) => {
        const updated = { ...prev, blockchainAnchor: customAnchorData };
        saveMatchToStorage(updated);
        return updated;
      });
      return customAnchorData;
    }
    
    try {
      const res = await api.anchorConsent({
        matchId: match.id,
        donorId: match.donor.id,
        recipientId: match.recipient.id,
        donorSignature: `sig_${match.donor.first_name.toLowerCase()}_${Date.now()}`,
        recipientSignature: `sig_${match.recipient.first_name.toLowerCase()}_${Date.now()}`,
      });
      const anchor = res.data;
      setMatch((prev) => {
        const updated = { ...prev, blockchainAnchor: anchor, status: 'ready_for_transplant' };
        saveMatchToStorage(updated);
        return updated;
      });
      return anchor;
    } catch (_err) {
      const mockAnchor = {
        chainId: 13371,
        txHash: '0x8f3c' + Math.random().toString(16).substring(2, 12) + 'a701b2',
        blockNumber: 154209,
        timestamp: new Date().toISOString(),
      };
      setMatch((prev) => {
        const updated = { ...prev, blockchainAnchor: mockAnchor, status: 'ready_for_transplant' };
        saveMatchToStorage(updated);
        return updated;
      });
      return mockAnchor;
    }
  }, [match.id, match.donor, match.recipient]);

  const signAgreement = useCallback((role) => {
    setMatch((prev) => {
      const donorSigned = role === 'donor' ? true : prev.donorSigned;
      const recipientSigned = role === 'recipient' ? true : prev.recipientSigned;
      let status = prev.status;

      if (donorSigned && recipientSigned && !['ready_for_transplant', 'agreement_finalized', 'contract_signed'].includes(status)) {
        status = 'agreement_finalized';
        eMessageToast(toast, 'agreement_signed', {});
        // Silently trigger background Besu anchoring without exposing web3 jargon to citizens
        anchorToBlockchain();
      }
      const updated = { ...prev, donorSigned, recipientSigned, status };
      saveMatchToStorage(updated);
      return updated;
    });
  }, [anchorToBlockchain, toast]);

  // Backward compatibility setter for legacy setConsentSigned(true) calls from existing forms
  const setConsentSigned = useCallback((val) => {
    if (val) {
      signAgreement('donor');
      signAgreement('recipient');
    } else {
      setMatch((prev) => {
        const updated = { ...prev, donorSigned: false, recipientSigned: false };
        saveMatchToStorage(updated);
        return updated;
      });
    }
  }, [signAgreement]);

  const resetMatch = useCallback(() => {
    setMatch(INITIAL_DEMO_MATCH);
    clearMatchFromStorage();
    clearStaticMatchesFromStorage();
    toast.info('Match demo state reset to initial pending institutional review.', { title: 'State Reset' });
  }, [toast]);

  const updateMatchFromProfile = useCallback((role, profileFields) => {
    const result = calculateUpdatedMatchFromProfile(match, role, profileFields);
    if (result.success && result.updatedMatch) {
      setMatch(result.updatedMatch);
      saveMatchToStorage(result.updatedMatch);
    }
    return result;
  }, [match]);

  // Derived convenience attributes for components
  const isApproved = useMemo(() => {
    return ['approved', 'waiting_donor_confirmation', 'waiting_recipient_confirmation', 'scheduled', 'agreement_finalized', 'contract_signed', 'ready_for_transplant'].includes(match.status);
  }, [match.status]);

  const hospitalApproved = isApproved;
  const doctorApproved = isApproved; // Synonym for legacy components

  const consentSigned = useMemo(() => {
    return (match.donorSigned && match.recipientSigned) || ['agreement_finalized', 'contract_signed', 'ready_for_transplant'].includes(match.status);
  }, [match.donorSigned, match.recipientSigned, match.status]);

  const isAgreementFinalized = consentSigned;
  const agreementSigned = consentSigned;

  const value = useMemo(() => ({
    match,
    advanceStatus,
    proposeSchedule,
    setScheduledDate,
    signAgreement,
    anchorToBlockchain,
    setConsentSigned,
    resetMatch,
    updateMatchFromProfile,
    isApproved,
    hospitalApproved,
    doctorApproved,
    consentSigned,
    isAgreementFinalized,
    agreementSigned
  }), [match, advanceStatus, proposeSchedule, setScheduledDate, signAgreement, anchorToBlockchain, setConsentSigned, resetMatch, updateMatchFromProfile, isApproved, hospitalApproved, doctorApproved, consentSigned, isAgreementFinalized, agreementSigned]);

  return (
    <MatchContext.Provider value={value}>
      {children}
    </MatchContext.Provider>
  );
}

export function useMatch() {
  const context = useContext(MatchContext);
  if (!context) {
    throw new Error('useMatch must be used within a MatchProvider');
  }
  return context;
}
