import assert from "node:assert/strict";
import {
    findMatchingVoiceChannel,
    resolveGuildBotChannels,
    resolveScopeChannels,
} from "./channelResolver";

console.log("Running channelResolver tests...");

// Mock voice channel structure
function createMockChannel(id: string, name: string, guildId: string, clientId: string) {
    return {
        id,
        name,
        isVoiceBased: () => true,
        guild: { id: guildId },
        client: {
            user: { id: clientId },
        },
    } as any;
}

// Mock client structure
function createMockClient(clientId: string, guildId: string, voiceChannels: any[]) {
    const channelMap = new Map(voiceChannels.map((ch) => [ch.id, ch]));
    return {
        isReady: () => true,
        user: { id: clientId },
        guilds: {
            cache: new Map([
                [
                    guildId,
                    {
                        id: guildId,
                        channels: {
                            fetch: async () => channelMap,
                        },
                    },
                ],
            ]),
        },
    } as any;
}

const mockGuildId = "guild-123";
const clientAtaqueId = "bot-ataque-id";
const clientDefensaId = "bot-defensa-id";

const ataqueChannel = createMockChannel("ch-invitados", "Ataque", mockGuildId, clientAtaqueId);
const defensaChannel = createMockChannel("ch-general", "Defensa", mockGuildId, clientDefensaId);

const mockAtaqueClient = createMockClient(clientAtaqueId, mockGuildId, [ataqueChannel]);
const mockDefensaClient = createMockClient(clientDefensaId, mockGuildId, [defensaChannel]);

const mockClients = {
    ataque: mockAtaqueClient,
    defensa: mockDefensaClient,
};

// Test 1: Resolves default Ataque and Defensa channels correctly
const resolved = await resolveGuildBotChannels(mockGuildId, null, mockClients);

assert.ok(resolved.ataque, "Should resolve Ataque channel");
assert.equal(resolved.ataque?.name, "Ataque");
assert.equal(resolved.ataque?.client?.user?.id, clientAtaqueId);

assert.ok(resolved.defensa, "Should resolve Defensa channel");
assert.equal(resolved.defensa?.name, "Defensa");
assert.equal(resolved.defensa?.client?.user?.id, clientDefensaId);

// Test 2: findMatchingVoiceChannel pure function
const channelsList = [ataqueChannel, defensaChannel];
assert.equal(findMatchingVoiceChannel(channelsList, "ataque")?.id, "ch-invitados");
assert.equal(findMatchingVoiceChannel(channelsList, "defensa")?.id, "ch-general");
assert.equal(findMatchingVoiceChannel(channelsList, "nonexistent"), undefined);

// Test 3: resolveScopeChannels pure function
const channelMap = { ataque: ataqueChannel, defensa: defensaChannel };
assert.deepEqual(resolveScopeChannels(channelMap, "global"), [ataqueChannel, defensaChannel]);
assert.deepEqual(resolveScopeChannels(channelMap, "ataque"), [ataqueChannel]);
assert.deepEqual(resolveScopeChannels(channelMap, "defensa"), [defensaChannel]);

console.log("All channelResolver tests passed successfully!");
