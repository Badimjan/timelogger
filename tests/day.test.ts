import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, clockTime, daysBetween, localDay, startFromClock } from "../lib/day.ts";

test("addDays crosses month and year boundaries", () => {
  assert.equal(addDays("2026-10-19", 1), "2026-10-20");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-01-01", -1), "2025-12-31");
  assert.equal(addDays("2026-10-19", -6), "2026-10-13");
});

test("daysBetween is inclusive", () => {
  assert.equal(daysBetween("2026-10-19", "2026-10-19"), 1);
  assert.equal(daysBetween("2026-10-13", "2026-10-19"), 7);
});

test("localDay uses the local calendar, not UTC", () => {
  assert.equal(localDay(new Date(2026, 9, 19, 0, 20)), "2026-10-19");
  assert.equal(localDay(new Date(2026, 9, 19, 23, 50)), "2026-10-19");
});

test("startFromClock picks that time today when it has already passed", () => {
  const now = new Date(2026, 9, 19, 9, 10, 30);
  const start = startFromClock("09:00", now)!;
  assert.equal(localDay(start), "2026-10-19");
  assert.equal(clockTime(start), "09:00");
  assert.equal(start.getSeconds(), 0);
});

test("startFromClock means yesterday when the time is still ahead of now", () => {
  const now = new Date(2026, 9, 19, 0, 20);
  const start = startFromClock("23:50", now)!;
  assert.equal(localDay(start), "2026-10-18");
  assert.equal(clockTime(start), "23:50");
});

test("startFromClock rejects malformed input", () => {
  assert.equal(startFromClock("25:00"), null);
  assert.equal(startFromClock("9"), null);
  assert.equal(startFromClock(""), null);
});
