import assert from "node:assert/strict";
import { eventHandler } from "./eventHandler";
import { calculateEventDelay, parseAndSortEvents, prepareScheduledEvents } from "./eventUtils";

console.log("Running EventHandler & eventUtils tests...");

// Test 1: loads, validates with Zod, and orders events correctly
const events = eventHandler.loadEvents();
assert.equal(events.length, 10, "Should load 10 events from eventList.json");

assert.deepEqual(events[0], {
    tts: "La GvG empezará en 1 minuto",
    scope: "global",
    remainingSeconds: 1860,
    rawTime: "31m",
});

assert.deepEqual(events[1], {
    tts: "Inicio de GvG",
    scope: "global",
    remainingSeconds: 1800,
    rawTime: "30m",
});

assert.deepEqual(events[9], {
    tts: "Fin de GvG",
    scope: "global",
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
    "Initial event at 30m with +10s offset should have 10s delay",
);
assert.equal(
    calculateEventDelay(1860, 1800, 300),
    240,
    "Pre-start event at 31m with +300s (35m) offset should have 240s delay (35m - 31m = 4m)",
);

// Test 3: prepareScheduledEvents filters out past events when negative offset bypasses them
const sampleEvents = [
    { tts: "Pre-start", scope: "global" as const, remainingSeconds: 1860, rawTime: "31m" },
    { tts: "Start", scope: "global" as const, remainingSeconds: 1800, rawTime: "30m" },
    { tts: "Middle", scope: "global" as const, remainingSeconds: 900, rawTime: "15m" },
    { tts: "End", scope: "global" as const, remainingSeconds: 0, rawTime: "0m" },
];
const scheduledWithOffset = prepareScheduledEvents(sampleEvents, -1000);
// Effective start: 1800 + (-1000) = 800s (t = ~13m 20s)
// Pre-start (1860): 800 - 1860 = -1060 (filtered)
// Start (1800): 800 - 1800 = -1000 (filtered)
// Middle (900): 800 - 900 = -100 (filtered)
// End (0): 800 - 0 = 800 (kept)
assert.equal(scheduledWithOffset.length, 1, "Should filter out past events");
const firstScheduled = scheduledWithOffset[0];
assert.ok(firstScheduled, "First scheduled item should exist");
assert.equal(firstScheduled.event.tts, "End");
assert.equal(firstScheduled.delaySeconds, 800);

// Test 4: Guild offset tracking
eventHandler.setGuildOffset("test-guild", 300);
assert.equal(
    eventHandler.getGuildOffset("test-guild"),
    300,
    "Guild offset should be stored correctly",
);

// Test 5: Zod schema fails validation for invalid event structure
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

// Test 6: EventHandler isRunning & stop state management
assert.equal(eventHandler.isRunning("fake-guild-id"), false);
eventHandler.stop("fake-guild-id"); // Should not throw for unstarted guild

console.log("All EventHandler & eventUtils tests passed successfully!");
