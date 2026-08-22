import assert from "node:assert/strict";
import { eventHandler } from "./eventHandler";

console.log("Running EventHandler tests...");

// Test 1: loads, validates with Zod, and orders events correctly
const events = eventHandler.loadEvents();
assert.equal(events.length, 7, "Should load 7 events");

assert.deepEqual(events[0], {
    tts: "Inicio de GvG",
    remainingSeconds: 1800,
    rawTime: "30m",
});

assert.deepEqual(events[1], {
    tts: "Junglas en 1 minuto",
    remainingSeconds: 1560,
    rawTime: "26m",
});

assert.deepEqual(events[2], {
    tts: "Junglas en 1 minuto",
    remainingSeconds: 1260,
    rawTime: "21m",
});

assert.deepEqual(events[3], {
    tts: "Junglas en 1 minuto",
    remainingSeconds: 960,
    rawTime: "16m",
});

assert.deepEqual(events[4], {
    tts: "Junglas en 1 minuto",
    remainingSeconds: 660,
    rawTime: "11m",
});

assert.deepEqual(events[5], {
    tts: "Junglas en 1 minuto",
    remainingSeconds: 360,
    rawTime: "6m",
});

assert.deepEqual(events[6], {
    tts: "Fin de GvG",
    remainingSeconds: 0,
    rawTime: "0m",
});

// Test 2: fails Zod validation for invalid event structure
const invalidData = [
    {
        tts: "Invalid event",
        event: {
            type: "wrong_type",
            t: "10m",
        },
    },
];

assert.throws(() => eventHandler.loadEvents(invalidData));

console.log("All EventHandler tests passed successfully!");
