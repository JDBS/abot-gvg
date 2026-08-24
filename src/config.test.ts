import assert from "node:assert/strict";
import { envSchema } from "./config";

console.log("Running config schema tests...");

// Test 1: Defaults are populated correctly
const defaultParsed = envSchema.parse({});
assert.equal(defaultParsed.DISCORD_TOKEN, "dummy-token");
assert.equal(defaultParsed.CLIENT_ID, "dummy-client-id");
assert.equal(defaultParsed.DEFAULT_LANGUAGE, "es");
assert.equal(defaultParsed.PORT, 3000);
assert.equal(defaultParsed.TTS_SPEED, 1.0);
assert.equal(defaultParsed.CLIENT_EVENT_TOKEN, "averno_secret_client_token");

// Test 2: Custom values and transformations
const customParsed = envSchema.parse({
    DISCORD_TOKEN: "custom-token-123",
    DEFAULT_LANGUAGE: "  EN  ",
    PORT: "8080",
    TTS_SPEED: "1.25",
});
assert.equal(customParsed.DISCORD_TOKEN, "custom-token-123");
assert.equal(customParsed.DEFAULT_LANGUAGE, "en");
assert.equal(customParsed.PORT, 8080);
assert.equal(customParsed.TTS_SPEED, 1.25);

console.log("All config schema tests passed successfully!");
