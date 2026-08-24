import assert from "node:assert/strict";
import { clientEventSchema } from "./clientEventSchemas";

console.log("Running clientEventSchemas tests...");

// Test 1: Valid client event payload with default scope
const validPayload = {
    token: "my-secret-token",
    event: "key_press",
    value: "Numpad 1",
};
const parsed = clientEventSchema.parse(validPayload);
assert.equal(parsed.token, "my-secret-token");
assert.equal(parsed.event, "key_press");
assert.equal(parsed.value, "Numpad 1");
assert.equal(parsed.scope, "global");

// Test 2: Valid payload with explicit scope
const explicitScope = clientEventSchema.parse({
    ...validPayload,
    scope: "ataque",
});
assert.equal(explicitScope.scope, "ataque");

// Test 3: Value coercion (number value converted to string)
const numberValue = clientEventSchema.parse({
    ...validPayload,
    value: 123,
});
assert.equal(numberValue.value, "123");

// Test 4: Missing required fields fail validation
assert.throws(() => clientEventSchema.parse({ event: "key_press", value: "test" })); // missing token
assert.throws(() => clientEventSchema.parse({ token: "token", value: "test" })); // missing event

console.log("All clientEventSchemas tests passed successfully!");
