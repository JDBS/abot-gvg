import assert from "node:assert/strict";
import { startCommand } from "./start";

console.log("Running startCommand tests...");

// Test 1: Schema definition check
const json = startCommand.data.toJSON();
assert.equal(json.name, "start");
assert.ok(json.options && json.options.length === 1, "Should have 1 option");
const option = json.options[0] as { name?: string; required?: boolean };
assert.equal(option.name, "offset");
assert.equal(option.required, false);

// Test 2: Execution without guildId (should reply with error)
let replyPayload: { content?: string; ephemeral?: boolean } | null = null;
const mockInteractionNoGuild = {
    guildId: null,
    options: {
        getString: () => null,
    },
    reply: async (payload: { content?: string; ephemeral?: boolean }) => {
        replyPayload = payload;
    },
};

await startCommand.execute(mockInteractionNoGuild as unknown as Parameters<typeof startCommand.execute>[0]);
assert.ok(replyPayload, "Should reply to interaction");
assert.equal(replyPayload.content, "Este comando solo se puede usar en un servidor.");
assert.equal(replyPayload.ephemeral, true);

// Test 3: Execution with invalid offset parameter (should catch parse error before channel resolution)
replyPayload = null;
const mockInteractionInvalidOffset = {
    guildId: "guild-123",
    options: {
        getString: (name: string) => (name === "offset" ? "invalid_time" : null),
    },
    reply: async (payload: { content?: string; ephemeral?: boolean }) => {
        replyPayload = payload;
    },
};

await startCommand.execute(mockInteractionInvalidOffset as unknown as Parameters<typeof startCommand.execute>[0]);
assert.ok(replyPayload, "Should reply with error on invalid offset");
assert.equal(replyPayload.ephemeral, true);
assert.ok((replyPayload.content ?? "").includes("❌ Error al establecer el offset:"));

console.log("All startCommand tests passed successfully!");
