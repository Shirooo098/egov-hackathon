import React, { useState } from 'react';

// Mock AI consultation slots for the calendar
const MOCK_SLOTS_BY_DAY = {
  23: [
    { id: 'slot-1', doctor: 'Dr. Maria Santos', specialty: 'Nephrologist (Kidney)', time: '09:00 AM - 10:00 AM', facility: 'Philippine General Hospital (PGH)', type: 'organ' },
    { id: 'slot-2', doctor: 'Dr. Jose Rizal', specialty: 'General Diagnostic Physician', time: '02:00 PM - 03:00 PM', facility: 'National Kidney and Transplant Institute (NKTI)', type: 'blood' }
  ],
  24: [
    { id: 'slot-3', doctor: 'Dr. Ana Reyes', specialty: 'Hepatologist (Liver)', time: '10:30 AM - 11:30 AM', facility: 'St. Luke\'s Medical Center', type: 'organ' }
  ],
  27: [
    { id: 'slot-4', doctor: 'Dr. Fernando Cruz', specialty: 'Cardiologist (Heart)', time: '01:30 PM - 02:30 PM', facility: 'Philippine Heart Center', type: 'organ' },
    { id: 'slot-5', doctor: 'Dr. Clara Gomez', specialty: 'Ophthalmologist (Cornea)', time: '03:30 PM - 04:30 PM', facility: 'Asian Hospital & Medical Center', type: 'organ' }
  ],
  28: [
    { id: 'slot-6', doctor: 'Dr. Maria Santos', specialty: 'Nephrologist (Kidney)', time: '11:00 AM - 12:00 PM', facility: 'Philippine General Hospital (PGH)', type: 'organ' }
  ]
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScheduleView({ onboardingAppointment, onSelectSlot }) {
  const [selectedDay, setSelectedDay] = useState(23);
  const [bookedSlotId, setBookedSlotId] = useState(null);

  // Generate 31 days for July 2026 (starting on Wednesday, index 3)
  const emptyPrefixSlots = [null, null, null]; // July 1 2026 starts on Wednesday
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);
  const calendarCells = [...emptyPrefixSlots, ...daysInMonth];

  const currentDaySlots = MOCK_SLOTS_BY_DAY[selectedDay] || [];

  const handleBook = (slot) => {
    setBookedSlotId(slot.id);
    if (onSelectSlot) onSelectSlot(slot);
  };

  return (
    <div className="anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Calendar Top Toolbar */}
      <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>July 2026</h2>
            <span className="badge badge-primary" style={{ fontSize: 10 }}>✨ AI Conflict-Free Engine</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>
            Tri-party optimal consultation calendar synchronized across Recipient, Donor, and Attending Physician.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setSelectedDay(23)}>
            Today
          </button>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            <button className="btn btn-ghost btn-sm" style={{ borderRadius: 0, padding: '0 10px' }}>‹</button>
            <button className="btn btn-ghost btn-sm" style={{ borderRadius: 0, padding: '0 10px' }}>›</button>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid Card */}
      <div className="card" style={{ padding: 24 }}>
        {/* Weekdays Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 12, textAlign: 'center' }}>
          {WEEKDAYS.map((day) => (
            <div key={day} style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-subtle)' }}>
              {day}
            </div>
          ))}
        </div>

        {/* 35-Cell Month Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {calendarCells.map((dayNum, idx) => {
            if (!dayNum) {
              return <div key={`empty-${idx}`} style={{ minHeight: 64, background: 'transparent' }} />;
            }

            const hasSlots = !!MOCK_SLOTS_BY_DAY[dayNum];
            const isSelected = selectedDay === dayNum;
            const slotsCount = hasSlots ? MOCK_SLOTS_BY_DAY[dayNum].length : 0;

            return (
              <div
                key={`day-${dayNum}`}
                onClick={() => setSelectedDay(dayNum)}
                style={{
                  minHeight: 70,
                  padding: 8,
                  borderRadius: 'var(--r-md)',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: isSelected ? 'rgba(0, 56, 168, 0.03)' : hasSlots ? 'white' : 'var(--background-alt)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  transition: 'all var(--t-fast)',
                  boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: isSelected ? 900 : 700, color: isSelected ? 'var(--primary)' : 'var(--foreground)' }}>
                    {dayNum}
                  </span>
                  {hasSlots && (
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)' }} />
                  )}
                </div>

                {hasSlots ? (
                  <div style={{ marginTop: 6 }}>
                    <span className="badge badge-success" style={{ fontSize: 9, padding: '2px 6px' }}>
                      {slotsCount} Slot{slotsCount > 1 ? 's' : ''}
                    </span>
                  </div>
                ) : (
                  <div style={{ marginTop: 'auto', fontSize: 10, color: 'var(--foreground-subtle)' }}>
                    No slots
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Slots Panel */}
      <div className="card anim-up" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>Available AI Consultation Slots</h3>
            <p style={{ fontSize: 12, color: 'var(--foreground-muted)' }}>Showing diagnostic &amp; transplant schedule options for July {selectedDay}, 2026</p>
          </div>
          <span className="badge badge-primary">{currentDaySlots.length} Recommended</span>
        </div>

        {currentDaySlots.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {currentDaySlots.map((slot) => {
              const isBooked = bookedSlotId === slot.id;
              return (
                <div
                  key={slot.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-md)',
                    padding: 16,
                    background: isBooked ? 'rgba(5, 150, 105, 0.03)' : 'var(--background-alt)',
                    borderColor: isBooked ? 'rgba(5, 150, 105, 0.3)' : 'var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 14
                  }}
                >
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong style={{ fontSize: 15 }}>{slot.doctor}</strong>
                      <span className="badge badge-verified" style={{ fontSize: 9 }}>DOH Licensed</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, marginTop: 2 }}>
                      {slot.specialty}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span>⏰ {slot.time}</span>
                      <span>·</span>
                      <span>🏥 {slot.facility}</span>
                    </div>
                  </div>

                  <div>
                    {isBooked ? (
                      <span className="badge badge-success" style={{ padding: '8px 16px', fontSize: 12 }}>
                        ✓ Slot Confirmed &amp; Booked
                      </span>
                    ) : (
                      <button className="btn btn-primary btn-sm" onClick={() => handleBook(slot)}>
                        Confirm &amp; Book Slot →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', background: 'var(--background-alt)', borderRadius: 'var(--r-md)', color: 'var(--foreground-muted)', fontSize: 13 }}>
            No diagnostic slots available on July {selectedDay}. Please click a highlighted calendar date with green slot indicators above.
          </div>
        )}
      </div>
    </div>
  );
}
