import assert from "node:assert/strict";
import { isDummyGuildId } from "./deploy-commands";

console.log("Running deploy-commands tests...");

// Test 1: Dummy guild IDs are identified correctly
assert.equal(isDummyGuildId(""), true);
assert.equal(isDummyGuildId(undefined), true);
assert.equal(isDummyGuildId("123"), true);
assert.equal(isDummyGuildId("dummy-guild-id"), true);
assert.equal(isDummyGuildId("dummy-guild-id-ataque"), true);
assert.equal(isDummyGuildId("dummy-guild-id-defensa"), true);

// Test 2: Valid real guild IDs return false
assert.equal(isDummyGuildId("123456789012345678"), false);

console.log("All deploy-commands tests passed successfully!");
