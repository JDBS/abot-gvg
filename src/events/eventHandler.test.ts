import assert from "node:assert/strict";
import { eventHandler } from "./eventHandler";
import { calculateEventDelay, parseAndSortEvents, prepareScheduledEvents } from "./eventUtils";

console.log("Running EventHandler & eventUtils tests...");

// Test 1: loads, validates with Zod, and orders events correctly
const events = eventHandler.loadEvents();
assert.equal(events.length, 9, "Should load 9 events");

assert.deepEqual(events[0], {
    tts: "Inicio de GvG",
    remainingSeconds: 1800,
    rawTime: "30m",
});

assert.deepEqual(events[8], {
    tts: "Fin de GvG",
    remainingSeconds: 0,
    rawTime: "0m",
});

// Test 2: calculateEventDelay pure function
assert.equal(
    calculateEventDelay(1800, 1800, 0),
    0,
    "Initial event at 30m with 0s offset should have 0s delay",
);
assert.equal(
    calculateEventDelay(1560, 1800, 0),
    240,
    "Event at 26m (1560s) with 30m start should have 240s delay",
);
assert.equal(
    calculateEventDelay(1800, 1800, 10),
    10,
    "Initial event with +10s offset should have 10s delay",
);

// Test 3: prepareScheduledEvents filters out past events when negative offset bypasses them
const sampleEvents = [
    { tts: "Start", remainingSeconds: 1800, rawTime: "30m" },
    { tts: "Middle", remainingSeconds: 900, rawTime: "15m" },
    { tts: "End", remainingSeconds: 0, rawTime: "0m" },
];
const scheduledWithOffset = prepareScheduledEvents(sampleEvents, -1000);
// Start delay: (1800 - 1800) + (-1000) = -1000 (filtered out)
// Middle delay: (1800 - 900) + (-1000) = -100 (filtered out)
// End delay: (1800 - 0) + (-1000) = 800 (kept)
assert.equal(scheduledWithOffset.length, 1, "Should filter out past events");
const firstScheduled = scheduledWithOffset[0];
assert.ok(firstScheduled, "First scheduled item should exist");
assert.equal(firstScheduled.event.tts, "End");
assert.equal(firstScheduled.delaySeconds, 800);

// Test 4: Zod schema fails validation for invalid event structure
const invalidData = [
    {
        tts: "Invalid event",
        event: {
            type: "wrong_type",
            t: "10m",
        },
    },
];

assert.throws(() => parseAndSortEvents(invalidData));

// Test 5: EventHandler isRunning & stop state management
assert.equal(eventHandler.isRunning("fake-guild-id"), false);
eventHandler.stop("fake-guild-id"); // Should not throw for unstarted guild

console.log("All EventHandler & eventUtils tests passed successfully!");
