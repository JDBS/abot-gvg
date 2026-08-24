import assert from "node:assert/strict";
import {
    getTargetClients,
    handleClientEvent,
    selectVoiceChannelForClient,
} from "./clientEventHandler";

console.log("Running clientEventHandler tests...");

// Test 1: getTargetClients with empty/undefined input
assert.deepEqual(getTargetClients(undefined, "global"), []);

// Test 2: getTargetClients with single Client instance
const dummyClient = { guilds: new Map() } as any;
assert.deepEqual(getTargetClients(dummyClient, "global"), [dummyClient]);

// Test 3: getTargetClients with BotClients map and scope filtering
const ataqueClient = { id: "ataque" } as any;
const defensaClient = { id: "defensa" } as any;
const clientsMap = { ataque: ataqueClient, defensa: defensaClient };

assert.deepEqual(getTargetClients(clientsMap, "global"), [ataqueClient, defensaClient]);
assert.deepEqual(getTargetClients(clientsMap, "ataque"), [ataqueClient]);
assert.deepEqual(getTargetClients(clientsMap, "defensa"), [defensaClient]);

// Test 4: selectVoiceChannelForClient priority resolution
const channelMember = {
    id: "ch-1",
    name: "General",
    members: new Map([["bot-id", {}]]),
} as any;
const channelPreferred = { id: "ch-2", name: "Invitados", members: new Map() } as any;
const voiceChannels = [channelPreferred, channelMember];

// Priority 1: member channel
const selectedMember = selectVoiceChannelForClient(voiceChannels, "bot-id", "Invitados");
assert.ok(selectedMember);
assert.equal(selectedMember.id, "ch-1");

// Priority 2: preferred channel when bot is not member
const selectedPreferred = selectVoiceChannelForClient(voiceChannels, "other-bot-id", "Invitados");
assert.ok(selectedPreferred);
assert.equal(selectedPreferred.id, "ch-2");

// Test 5: handleClientEvent default event processing
const genericResult = await handleClientEvent("custom_event", "test_value");
assert.equal(genericResult.processed, true);
assert.equal(genericResult.detail, "Event custom_event logged");

console.log("All clientEventHandler tests passed successfully!");
