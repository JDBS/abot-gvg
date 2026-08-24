import assert from "node:assert/strict";
import { parseOffsetInput, secondsToString, stringToSeconds } from "./timeConversion";

console.log("Running timeConversion tests...");

// Test stringToSeconds with valid inputs
assert.equal(stringToSeconds("30m"), 1800, "30m should convert to 1800s");
assert.equal(stringToSeconds("2h 23m 1s"), 8581, "2h 23m 1s should convert to 8581s");
assert.equal(stringToSeconds("10s"), 10, "10s should convert to 10s");
assert.equal(stringToSeconds("1h"), 3600, "1h should convert to 3600s");
assert.equal(stringToSeconds("  2m 5s  "), 125, "Should handle leading/trailing whitespace");

// Test stringToSeconds with signed and raw inputs
assert.equal(stringToSeconds("+5m"), 300, "+5m should convert to 300s");
assert.equal(stringToSeconds("-2m"), -120, "-2m should convert to -120s");
assert.equal(stringToSeconds("300"), 300, "300 should convert to 300s");

// Test stringToSeconds with invalid inputs
assert.throws(() => stringToSeconds(""), /Invalid time format/);
assert.throws(() => stringToSeconds("invalid"), /Invalid time format/);
assert.throws(() => stringToSeconds("10x"), /Invalid time format/);

// Test parseOffsetInput
assert.equal(
    parseOffsetInput("35m"),
    300,
    "35m countdown start should give +300s offset (35m - 30m)",
);
assert.equal(parseOffsetInput("+5m"), 300, "+5m explicit offset should give +300s");
assert.equal(parseOffsetInput("5m"), 300, "5m offset should give +300s");
assert.equal(parseOffsetInput("-2m"), -120, "-2m explicit offset should give -120s");
assert.equal(
    parseOffsetInput("28m"),
    -120,
    "28m countdown start should give -120s offset (28m - 30m)",
);

// Test secondsToString with valid inputs
assert.equal(secondsToString(1800), "30m", "1800s should format to 30m");
assert.equal(secondsToString(8581), "2h 23m 1s", "8581s should format to 2h 23m 1s");
assert.equal(secondsToString(0), "0s", "0s should format to 0s");
assert.equal(secondsToString(45), "45s", "45s should format to 45s");

// Test secondsToString with invalid inputs
assert.throws(() => secondsToString(-10), /Invalid seconds/);
assert.throws(() => secondsToString(NaN), /Invalid seconds/);

console.log("All timeConversion tests passed!");
