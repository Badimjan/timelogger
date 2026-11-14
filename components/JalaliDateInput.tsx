"use client";

import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persian_fa from "react-date-object/locales/persian_fa";
import "react-multi-date-picker/styles/colors/teal.css";

const toDate = (day: string) => new Date(`${day}T12:00:00`);

// Jalali date picker; value/onChange stay Gregorian YYYY-MM-DD so callers don't care about the calendar.
export function JalaliDateInput({
  value,
  onChange,
  min,
  max,
  label,
  className,
}: {
  value: string;
  onChange: (day: string) => void;
  min?: string;
  max?: string;
  label: string;
  className?: string;
}) {
  return (
    <DatePicker
      value={new DateObject({ date: toDate(value), calendar: persian, locale: persian_fa })}
      onChange={(d) => {
        if (!(d instanceof DateObject)) return;
        const g = d.convert(gregorian);
        onChange(`${g.year}-${String(g.month.number).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`);
      }}
      calendar={persian}
      locale={persian_fa}
      format="YYYY/MM/DD"
      minDate={min ? toDate(min) : undefined}
      maxDate={max ? toDate(max) : undefined}
      inputClass={className}
      className="bg-dark teal"
      containerStyle={{ display: "inline-block" }}
      editable={false}
      arrow={false}
      aria-label={label}
    />
  );
}
