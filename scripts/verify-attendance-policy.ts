import assert from "node:assert/strict";
import { attendanceGate } from "../src/lib/attendance-policy";
assert.equal(attendanceGate("2026-11-12", "14:00", new Date("2026-11-12T13:14:59Z")).remainingMs, 1000);
assert.equal(attendanceGate("2026-11-12", "14:00", new Date("2026-11-12T13:15:00Z")).remainingMs, 0);
assert.equal(attendanceGate("2026-11-12", "14:00", new Date("2026-11-12T13:00:00Z")).opensAt, "14:15");
assert.equal(attendanceGate("2026-11-12", "23:59", new Date("2026-11-12T22:59:00Z")).remainingMs, 900000);
assert.equal(attendanceGate("2026-11-12", "14:00", new Date("2026-11-13T00:00:00Z")).remainingMs, 0);
console.log("PASS Casablanca: blocked at 14:14:59, opens at 14:15, midnight boundary and past sessions");
