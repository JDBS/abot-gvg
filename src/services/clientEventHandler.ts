import type { Client, VoiceBasedChannel } from "discord.js";
import { env } from "../config";
import type { BotScope } from "../events/eventSchemas";
import { findMatchingVoiceChannel } from "../utils/channelResolver";
import { logger } from "../utils/logger";
import { ttsService } from "./tts";

/**
 * Interface representing active Discord client instances for bot scopes.
 */
export interface BotClients {
    ataque?: Client;
    defensa?: Client;
}

/**
 * Pure function that selects the most appropriate voice channel for a bot client based on priority rules:
 * 1. Channel where bot is currently a member.
 * 2. Channel matching preferred channel name.
 * 3. Channel with "general" in its name.
 * 4. First available voice channel.
 *
 * @param voiceChannels - List of available voice channels in a guild.
 * @param clientId - The ID of the bot client.
 * @param preferredChannelName - Optional preferred voice channel name.
 * @returns Selected VoiceBasedChannel or undefined if none available.
 */
export function selectVoiceChannelForClient(
    voiceChannels: VoiceBasedChannel[],
    clientId?: string,
    preferredChannelName?: string,
): VoiceBasedChannel | undefined {
    if (!voiceChannels || voiceChannels.length === 0) return undefined;

    if (clientId) {
        const currentMemberChannel = voiceChannels.find((c) => c.members.has(clientId));
        if (currentMemberChannel) return currentMemberChannel;
    }

    if (preferredChannelName) {
        const preferredMatch = findMatchingVoiceChannel(voiceChannels, preferredChannelName);
        if (preferredMatch) return preferredMatch;
    }

    const generalMatch = findMatchingVoiceChannel(voiceChannels, "general");
    if (generalMatch) return generalMatch;

    return voiceChannels[0];
}

/**
 * Pure function that resolves target Discord clients matching the specified BotScope.
 *
 * @param clients - Active Discord client map or single Client instance.
 * @param scope - Target bot scope ("global", "ataque", "defensa").
 * @returns Array of target Client instances.
 */
export function getTargetClients(
    clients?: BotClients | Client,
    scope: BotScope = "global",
): Client[] {
    if (!clients) return [];

    // Backwards compatibility if a single Client is passed
    if ("guilds" in clients) {
        return [clients];
    }

    const targetList: Client[] = [];
    if ((scope === "global" || scope === "ataque") && clients.ataque) {
        targetList.push(clients.ataque);
    }
    if ((scope === "global" || scope === "defensa") && clients.defensa) {
        targetList.push(clients.defensa);
    }

    return targetList;
}

/**
 * Result structure returned by handleClientEvent.
 */
export interface ClientEventResult {
    processed: boolean;
    detail?: string;
}

/**
 * Handles incoming client events received via HTTP API POST request.
 *
 * @param eventName - The event identifier (e.g., "key_press").
 * @param value - The string message/value associated with the event.
 * @param clients - Optional Discord client(s) instance or BotClients map.
 * @param scope - The bot scope ("global", "ataque", "defensa"). Defaults to "global".
 * @returns Promise resolving to ClientEventResult.
 */
export async function handleClientEvent(
    eventName: string,
    value: string,
    clients?: BotClients | Client,
    scope: BotScope = "global",
): Promise<ClientEventResult> {
    logger.info(
        `Processing client event: "${eventName}" with value: "${value}" and scope: "${scope}"`,
    );

    switch (eventName) {
        case "key_press": {
            logger.info(`Global hotkey event received: "${value}" (Scope: ${scope})`);
            const ttsText = String(value);
            const targetClients = getTargetClients(clients, scope);

            if (targetClients.length > 0) {
                const speakPromises = targetClients.map(async (client) => {
                    const preferredChannel =
                        typeof clients === "object" &&
                        "ataque" in clients &&
                        client === clients.ataque
                            ? env.ATAQUE_CANAL
                            : typeof clients === "object" &&
                                "defensa" in clients &&
                                client === clients.defensa
                              ? env.DEFENSA_CANAL
                              : undefined;

                    if (client.guilds.cache.size > 0) {
                        for (const [, guild] of client.guilds.cache) {
                            try {
                                const channels = await guild.channels.fetch();
                                const voiceChannels = Array.from(channels.values()).filter(
                                    (c): c is VoiceBasedChannel => c?.isVoiceBased() ?? false,
                                );

                                const voiceChannel = selectVoiceChannelForClient(
                                    voiceChannels,
                                    client.user?.id,
                                    preferredChannel,
                                );

                                if (voiceChannel) {
                                    logger.info(
                                        `Speaking TTS message "${ttsText}" in voice channel "${voiceChannel.name}" (Scope: ${scope})`,
                                    );
                                    await ttsService.speak(voiceChannel, ttsText);
                                    return true;
                                }
                            } catch (error) {
                                logger.error(error, "Failed to trigger TTS in voice channel");
                            }
                        }
                    }
                    return false;
                });

                const results = await Promise.all(speakPromises);
                const spokenCount = results.filter(Boolean).length;

                if (spokenCount === 0) {
                    logger.warn("No available voice channel found for TTS execution.");
                }
            } else {
                logger.warn("Discord client not connected or no active guilds available for TTS.");
            }

            return { processed: true, detail: `Event "${ttsText}" read via TTS` };
        }
        default:
            logger.info(`Received generic client event "${eventName}" with value "${value}"`);
            return { processed: true, detail: `Event ${eventName} logged` };
    }
}
