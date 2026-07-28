import React, { useState, useMemo, useEffect } from 'react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Helper: Get days in month with weekday offset
const getMonthCalendar = (year, month) => {
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  // Previous month trailing days
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, currentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true, date: new Date(year, month, d) });
  }

  // Next month leading days to fill 6 weeks (42 cells)
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, currentMonth: false, date: new Date(year, month + 1, d) });
  }

  return cells;
};

// Generate 3 months of calendar data
const getThreeMonthCalendars = () => {
  const today = new Date();
  const calendars = [];
  for (let i = 0; i < 3; i++) {
    const month = (today.getMonth() + i) % 12;
    const year = today.getFullYear() + Math.floor((today.getMonth() + i) / 12);
    calendars.push({
      year,
      month,
      label: `${MONTHS[month]} ${year}`,
      cells: getMonthCalendar(year, month),
      isCurrent: i === 0
    });
  }
  return calendars;
};

export default function CalendarScheduleView({
  slots = [],
  matchType = 'blood', // 'blood' | 'organ'
  onSelectSlot,
  onBookSlot,
  selectedSlotId = null,
  showLegend = true,
  onBack,
  donorName,
  organType,
  bloodType
}) {
  const [calendars] = useState(getThreeMonthCalendars);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);

  // Filter slots for selected date
  const daySlots = useMemo(() => {
    const sel = new Date(selectedDate);
    sel.setHours(0, 0, 0, 0);
    return slots.filter(s => {
      const slotDate = new Date(s.start);
      slotDate.setHours(0, 0, 0, 0);
      return slotDate.getTime() === sel.getTime();
    });
  }, [slots, selectedDate]);

  // Get all dates that have slots for visual indicators
  const datesWithSlots = useMemo(() => {
    const set = new Set();
    slots.forEach(s => {
      const d = new Date(s.start);
      d.setHours(0, 0, 0, 0);
      set.add(d.getTime());
    });
    return set;
  }, [slots]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleDayClick = (date, isCurrentMonth) => {
    if (!isCurrentMonth) return;
    setSelectedDate(date);
  };

  const isSelected = (date) => {
    return date.getTime() === selectedDate.getTime();
  };

  const isToday = (date) => {
    return date.getTime() === today.getTime();
  };

  const hasSlots = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return datesWithSlots.has(d.getTime());
  };

  const isPast = (date) => {
    return date < today;
  };

  const formatTime = (iso) => new Date(iso).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* -- Calendar Header -- */}
      <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>
              AI-Optimized Consultation Calendar
            </h2>
            <span className="badge badge-primary" style={{ fontSize: 10 }}>
              {matchType === 'organ' ? 'Organ Transplant Pathway' : 'Blood Donation Pathway'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>
            Tri-party scheduling synchronized across Recipient, Donor, and Attending Physician.
            {slots.length > 0 && <span style={{ marginLeft: 12, color: 'var(--emerald)', fontWeight: 600 }}> · {slots.length} slots available over 3 months</span>}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setSelectedDate(new Date())}>Today</button>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
            <button className="btn btn-ghost btn-sm" style={{ borderRadius: 0, padding: '0 10px' }} onClick={() => navigateMonth(-1)} aria-label="Previous month">‹</button>
            <button className="btn btn-ghost btn-sm" style={{ borderRadius: 0, padding: '0 10px' }} onClick={() => navigateMonth(1)} aria-label="Next month">›</button>
          </div>
        </div>
      </div>

      {/* -- 3-Month Calendar Grid -- */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {calendars.map((cal, calIdx) => (
            <div key={`${cal.year}-${cal.month}`} style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Month Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: cal.isCurrent ? '2px solid var(--primary)' : '1px solid var(--border)'
              }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: cal.isCurrent ? 'var(--primary)' : 'var(--foreground)' }}>
                  {cal.label}
                </span>
                {cal.isCurrent && <span className="badge badge-primary" style={{ fontSize: 9 }}>Current</span>}
              </div>

              {/* Weekday Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8, textAlign: 'center' }}>
                {WEEKDAYS.map((day) => (
                  <div key={day} style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--foreground-subtle)', padding: '4px 0' }}>
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid - 6 weeks x 7 days */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {cal.cells.map((cell, idx) => {
                  const { day, currentMonth, date } = cell;
                  const selected = isSelected(date);
                  const todayFlag = isToday(date);
                  const past = isPast(date);
                  const hasSlot = hasSlots(date) && currentMonth;

                  return (
                    <div
                      key={`${cal.year}-${cal.month}-${idx}`}
                      onClick={() => handleDayClick(date, currentMonth)}
                      onMouseEnter={() => currentMonth && setHoveredDate(date)}
                      onMouseLeave={() => setHoveredDate(null)}
                      style={{
                        minHeight: 56,
                        padding: 6,
                        borderRadius: 'var(--r-sm)',
                        border: selected ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: selected
                          ? 'rgba(0, 56, 168, 0.05)'
                          : todayFlag
                          ? 'rgba(0, 56, 168, 0.03)'
                          : past || !currentMonth
                          ? 'var(--background-alt)'
                          : hasSlot
                          ? 'rgba(5, 150, 105, 0.04)'
                          : 'white',
                        cursor: currentMonth && !past ? 'pointer' : 'default',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all var(--t-fast)',
                        opacity: past || !currentMonth ? 0.5 : 1,
                        boxShadow: selected ? 'var(--shadow-sm)' : hoveredDate?.getTime() === date.getTime() ? 'var(--shadow-md)' : 'none',
                        transform: hoveredDate?.getTime() === date.getTime() ? 'scale(1.02)' : 'none'
                      }}
                      aria-selected={selected}
                      aria-label={`${MONTHS[date.getMonth()]} ${day}, ${date.getFullYear()}${hasSlot ? ', has available slots' : ''}${todayFlag ? ', today' : ''}`}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: 12,
                          fontWeight: selected || todayFlag ? 900 : hasSlot ? 700 : 600,
                          color: selected || todayFlag ? 'var(--primary)' : past ? 'var(--foreground-subtle)' : hasSlot ? 'var(--emerald)' : 'var(--foreground)'
                        }}>
                          {day}
                        </span>
                        {hasSlot && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', flexShrink: 0 }} />
                        )}
                      </div>

                      {hasSlot && (
                        <div style={{ marginTop: 4 }}>
                          <span className="badge badge-success" style={{ fontSize: 8, padding: '1px 5px' }}>
                            {slots.filter(s => {
                              const d = new Date(s.start);
                              d.setHours(0,0,0,0);
                              return d.getTime() === date.getTime();
                            }).length} slot{slots.filter(s => {
                              const d = new Date(s.start);
                              d.setHours(0,0,0,0);
                              return d.getTime() === date.getTime();
                            }).length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {todayFlag && !hasSlot && (
                        <div style={{ marginTop: 'auto', fontSize: 9, color: 'var(--primary)', fontWeight: 600 }}>Today</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* -- Selected Day Slots Panel -- */}
      <div className="card anim-up" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>
              {selectedDate.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 2 }}>
              Showing {matchType === 'organ' ? 'surgical consultation' : 'blood donation'} slots for this date
            </p>
          </div>
          <span className="badge badge-primary">{daySlots.length} Available</span>
        </div>

        {daySlots.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {daySlots.map((slot) => {
              const isBooked = selectedSlotId === slot.id;
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 15 }}>{slot.doctor || 'Assigned Specialist'}</strong>
                      <span className="badge badge-verified" style={{ fontSize: 9 }}>DOH Licensed</span>
                      {slot.status === 'recommended' && <span className="badge badge-success" style={{ fontSize: 9 }}>Recommended</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, marginTop: 2 }}>
                      {slot.specialty || (matchType === 'organ' ? 'Transplant Surgeon' : 'Blood Bank Specialist')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span>⏰ {formatTime(slot.start)} – {formatTime(slot.end)}</span>
                      <span>·</span>
                      <span>🏥 {slot.location || slot.facility}</span>
                    </div>
                    {slot.notes && (
                      <div style={{ fontSize: 11, color: 'var(--foreground-subtle)', marginTop: 4, padding: '6px 10px', background: 'white', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                        {slot.notes}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {isBooked ? (
                      <span className="badge badge-success" style={{ padding: '8px 16px', fontSize: 12 }}>✓ Slot Confirmed & Booked</span>
                    ) : (
                      <>
                        <button className="btn btn-outline btn-sm" onClick={() => onSelectSlot?.(slot)}>View Details</button>
                        <button className="btn btn-primary btn-sm" onClick={() => onBookSlot?.(slot)}>Confirm & Book →</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', background: 'var(--background-alt)', borderRadius: 'var(--r-md)', color: 'var(--foreground-muted)', fontSize: 13 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'white', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--foreground-subtle)' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--foreground)' }}>No slots on this date</p>
            <p>Click a highlighted date (green dot) in the calendar above to see available consultation slots.</p>
          </div>
        )}

        {/* Legend */}
        {showLegend && (
          <div style={{ marginTop: 20, padding: 16, background: 'var(--background-alt)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground-subtle)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calendar Legend</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
              <LegendItem color="rgba(0, 56, 168, 0.05)" border="2px solid var(--primary)" label="Selected Date" />
              <LegendItem color="rgba(0, 56, 168, 0.03)" border="1px solid var(--primary)" label="Today" />
              <LegendItem color="rgba(5, 150, 105, 0.04)" border="1px solid var(--emerald)" label="Has Available Slots" dot={true} />
              <LegendItem color="var(--background-alt)" border="1px solid var(--border)" label="No Slots / Past Date" opacity={0.5} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, border, label, dot, opacity = 1 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity, fontSize: 11, color: 'var(--foreground-muted)' }}>
      <div style={{ width: 14, height: 14, borderRadius: 4, background: color, border, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {dot && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--emerald)' }} />}
      </div>
      <span>{label}</span>
    </div>
  );
}

// Navigation helper
function navigateMonth(delta) {
  // This would need to be handled via state in parent or ref
  // For now, we rely on the 3-month static view
}