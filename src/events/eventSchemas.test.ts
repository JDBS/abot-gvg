import assert from "node:assert/strict";
import { BotScopeSchema, EventListSchema, GvGEventSchema } from "./eventSchemas";

console.log("Running eventSchemas tests...");

// Test 1: BotScopeSchema defaults and validation
assert.equal(BotScopeSchema.parse(undefined), "global");
assert.equal(BotScopeSchema.parse("ataque"), "ataque");
assert.equal(BotScopeSchema.parse("defensa"), "defensa");
assert.throws(() => BotScopeSchema.parse("invalid_scope"));

// Test 2: GvGEventSchema validation
const validEvent = {
    tts: "Inicio de GvG",
    event: {
        type: "time",
        scope: "global",
        t: "30m",
    },
};
const parsedEvent = GvGEventSchema.parse(validEvent);
assert.equal(parsedEvent.tts, "Inicio de GvG");
assert.equal(parsedEvent.event.t, "30m");

// Test 3: EventListSchema validation
const validList = [validEvent];
const parsedList = EventListSchema.parse(validList);
assert.equal(parsedList.length, 1);

console.log("All eventSchemas tests passed successfully!");
