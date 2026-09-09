import "../../styles/components/match/CalendarScheduleView.css";
import React, { useState, useMemo } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalIcon,
} from "../../components/ui/Icons";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Build a single month grid: 6 weeks × 7 days, including trailing/leading days from neighbors.
const getMonthCells = (year, month) => {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells = [];

  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({
      day: prevMonthDays - i,
      currentMonth: false,
      date: new Date(year, month - 1, prevMonthDays - i),
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, currentMonth: true, date: new Date(year, month, d) });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({
      day: d,
      currentMonth: false,
      date: new Date(year, month + 1, d),
    });
  }
  return cells;
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });

export default function CalendarScheduleView({
  slots = [],
  matchType = "blood",
  onSelectSlot,
  onBookSlot,
  selectedSlotId = null,
  showLegend = false,
  onBack,
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });
  const [selectedDate, setSelectedDate] = useState(today);

  // Index of available-slot counts by yyyy-mm-dd for fast lookup
  const slotCountByDate = useMemo(() => {
    const map = new Map();
    slots.forEach((s) => {
      const key = startOfDay(s.start).getTime();
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [slots]);

  const cells = useMemo(() => getMonthCells(view.year, view.month), [view]);

  const daySlots = useMemo(() => {
    const key = startOfDay(selectedDate).getTime();
    return slots
      .filter((s) => startOfDay(s.start).getTime() === key)
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [slots, selectedDate]);

  const goPrev = () => {
    const m = view.month === 0 ? 11 : view.month - 1;
    const y = view.month === 0 ? view.year - 1 : view.year;
    setView({ year: y, month: m });
  };
  const goNext = () => {
    const m = view.month === 11 ? 0 : view.month + 1;
    const y = view.month === 11 ? view.year + 1 : view.year;
    setView({ year: y, month: m });
  };
  const goToday = () => {
    setView({ year: today.getFullYear(), month: today.getMonth() });
    setSelectedDate(today);
  };

  const handleDayClick = (date, currentMonth) => {
    if (!currentMonth) return;
    setSelectedDate(date);
  };

  return (
    <div className="anim-in calendar-schedule-view">
      {/* -- Header card: one title, one month nav, no decoration -- */}
      <div className="card calendar-schedule-card calendar-schedule-header">
        <div className="calendar-schedule-heading">
          <span className="calendar-schedule-icon" aria-hidden>
            <CalIcon size={16} />
          </span>
          <div>
            <h2 className="calendar-schedule-title">
              Pick a date for your consultation
            </h2>
            <p className="calendar-schedule-subtitle">
              {matchType === "organ"
                ? "Surgical consultation"
                : "Blood donation"}{" "}
              · {slots.length} {slots.length === 1 ? "slot" : "slots"} available
              over the next 3 months
            </p>
          </div>
        </div>

        <div className="calendar-schedule-nav">
          <button
            className="cal-nav-btn"
            onClick={goPrev}
            aria-label="Previous month"
            type="button"
          >
            <ChevronLeftIcon size={16} />
          </button>
          <span className="cal-month-label">
            {MONTHS[view.month]} {view.year}
          </span>
          <button
            className="cal-nav-btn"
            onClick={goNext}
            aria-label="Next month"
            type="button"
          >
            <ChevronRightIcon size={16} />
          </button>
          <button
            className="btn btn-ghost btn-sm calendar-schedule-today"
            onClick={goToday}
            type="button"
          >
            Today
          </button>
        </div>
      </div>

      {/* -- One month grid -- */}
      <div className="card calendar-schedule-card calendar-schedule-grid-card">
        {/* Weekday row */}
        <div className="cal-weekdays">
          {WEEKDAYS.map((d) => (
            <div key={d} className="cal-weekday">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="cal-grid">
          {cells.map((cell, idx) => {
            const { day, currentMonth, date } = cell;
            const key = startOfDay(date).getTime();
            const count = slotCountByDate.get(key) || 0;
            const isSelected =
              currentMonth && key === startOfDay(selectedDate).getTime();
            const isToday = key === today.getTime();
            const isPast = date < today;
            const hasSlots = count > 0 && currentMonth && !isPast;

            const classes = ["cal-cell"];
            if (!currentMonth) classes.push("cal-cell-out");
            if (isPast) classes.push("cal-cell-past");
            if (isToday) classes.push("cal-cell-today");
            if (hasSlots) classes.push("cal-cell-has-slots");
            if (isSelected) classes.push("cal-cell-selected");

            return (
              <button
                key={`${view.year}-${view.month}-${idx}`}
                type="button"
                className={classes.join(" ")}
                onClick={() => handleDayClick(date, currentMonth)}
                disabled={!currentMonth || isPast}
                aria-pressed={isSelected}
                aria-label={`${MONTHS[date.getMonth()]} ${day}, ${date.getFullYear()}${
                  hasSlots
                    ? `, ${count} slot${count > 1 ? "s" : ""} available`
                    : ""
                }${isToday ? ", today" : ""}`}
              >
                <span className="cal-cell-day">{day}</span>
                {hasSlots && <span className="cal-cell-dot" aria-hidden />}
              </button>
            );
          })}
        </div>

        {showLegend && (
          <div className="cal-legend">
            <span>
              <span className="cal-legend-swatch cal-legend-selected" />{" "}
              Selected
            </span>
            <span>
              <span className="cal-legend-swatch cal-legend-today" /> Today
            </span>
            <span>
              <span className="cal-legend-swatch cal-legend-has" /> Has open
              slots
            </span>
            <span>
              <span className="cal-legend-swatch cal-legend-past" /> Unavailable
            </span>
          </div>
        )}
      </div>

      {/* -- Selected-day slots -- */}
      <div className="card calendar-schedule-card calendar-schedule-slots-card">
        <div className="calendar-schedule-slots-heading">
          <h3 className="calendar-schedule-slots-title">
            {selectedDate.toLocaleDateString("en-PH", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h3>
          <span className="calendar-schedule-slots-count">
            {daySlots.length === 0
              ? "No open slots"
              : `${daySlots.length} open ${daySlots.length === 1 ? "slot" : "slots"}`}
          </span>
        </div>

        {daySlots.length > 0 ? (
          <div className="calendar-schedule-slots">
            {daySlots.map((slot) => {
              const isBooked = selectedSlotId === slot.id;
              return (
                <div
                  key={slot.id}
                  className={`cal-slot${isBooked ? " cal-slot-booked" : ""}`}
                >
                  <div className="calendar-schedule-slot-info">
                    <div className="calendar-schedule-slot-heading">
                      <strong className="calendar-schedule-doctor">
                        {slot.doctor || "Assigned Specialist"}
                      </strong>
                      {slot.status === "recommended" && (
                        <span className="badge badge-success calendar-schedule-recommended">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="calendar-schedule-slot-meta">
                      <span>
                        ⏰ {formatTime(slot.start)} – {formatTime(slot.end)}
                      </span>
                      <span className="calendar-schedule-separator">·</span>
                      <span>🏥 {slot.location || slot.facility}</span>
                    </div>
                    {slot.notes && (
                      <div className="calendar-schedule-notes">
                        {slot.notes}
                      </div>
                    )}
                  </div>
                  <div className="calendar-schedule-slot-action">
                    {isBooked ? (
                      <span className="badge badge-success calendar-schedule-booked">
                        ✓ Booked
                      </span>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onBookSlot?.(slot)}
                        type="button"
                      >
                        Book this slot
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="cal-empty">
            <p className="calendar-schedule-empty-title">
              No slots on this date
            </p>
            <p className="calendar-schedule-empty-copy">
              Pick a day with a green dot to see open times.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
