import assert from "node:assert/strict";
import { resolveGuildBotChannels } from "./channelResolver";

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

const ataqueChannel = createMockChannel("ch-invitados", "Invitados", mockGuildId, clientAtaqueId);
const defensaChannel = createMockChannel("ch-general", "General", mockGuildId, clientDefensaId);

const mockAtaqueClient = createMockClient(clientAtaqueId, mockGuildId, [ataqueChannel]);
const mockDefensaClient = createMockClient(clientDefensaId, mockGuildId, [defensaChannel]);

const mockClients = {
    ataque: mockAtaqueClient,
    defensa: mockDefensaClient,
};

// Test 1: Resolves default Ataque and Defensa channels correctly
const resolved = await resolveGuildBotChannels(mockGuildId, null, mockClients);

assert.ok(resolved.ataque, "Should resolve Ataque channel");
assert.equal(resolved.ataque?.name, "Invitados");
assert.equal(resolved.ataque?.client?.user?.id, clientAtaqueId);

assert.ok(resolved.defensa, "Should resolve Defensa channel");
assert.equal(resolved.defensa?.name, "General");
assert.equal(resolved.defensa?.client?.user?.id, clientDefensaId);

console.log("All channelResolver tests passed successfully!");
