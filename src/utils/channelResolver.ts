import type { Client, VoiceBasedChannel } from "discord.js";
import { env } from "../config";
import type { ChannelMap } from "../events/eventHandler";
import type { BotScope } from "../events/eventSchemas";
import { logger } from "./logger";

/**
 * Interface representing active Discord client instances for bot scopes.
 */
export interface BotClients {
    /** Discord client for Bot de Ataque */
    ataque?: Client;
    /** Discord client for Bot de Defensa */
    defensa?: Client;
}

/**
 * Pure function that finds a matching voice channel from a list by exact or partial name match.
 *
 * @param channels - Array of voice channels to search within.
 * @param targetName - The channel name string to match against.
 * @returns The matching VoiceBasedChannel or undefined if not found.
 */
export function findMatchingVoiceChannel(
    channels: VoiceBasedChannel[],
    targetName: string,
): VoiceBasedChannel | undefined {
    if (!channels || channels.length === 0 || !targetName) return undefined;
    const lowerTarget = targetName.toLowerCase();
    return (
        channels.find((c) => c.name.toLowerCase() === lowerTarget) ??
        channels.find((c) => c.name.toLowerCase().includes(lowerTarget))
    );
}

/**
 * Pure function that resolves target voice channels matching the specified BotScope from a ChannelMap.
 *
 * @param channelMap - Map containing ataque and defensa voice channels.
 * @param scope - The bot scope ("global", "ataque", or "defensa").
 * @returns Array of unique target VoiceBasedChannel instances.
 */
export function resolveScopeChannels(
    channelMap: ChannelMap,
    scope: BotScope = "global",
): VoiceBasedChannel[] {
    const targetChannels: VoiceBasedChannel[] = [];

    if ((scope === "global" || scope === "ataque") && channelMap.ataque) {
        targetChannels.push(channelMap.ataque);
    }
    if ((scope === "global" || scope === "defensa") && channelMap.defensa) {
        if (scope !== "global" || channelMap.defensa !== channelMap.ataque) {
            targetChannels.push(channelMap.defensa);
        }
    }

    return targetChannels;
}

/**
 * Resolves the voice channels for Bot de Ataque and Bot de Defensa for a given guild ID.
 * Ensures that each resolved VoiceBasedChannel object belongs to the respective Discord client,
 * so that VoiceConnection's group parameter is correctly set to client.user.id.
 *
 * @param guildId - The Discord guild ID.
 * @param userVoiceChannel - Optional voice channel of the user invoking the action.
 * @param clients - Optional active BotClients map.
 * @returns Promise resolving to ChannelMap with resolved Ataque and Defensa voice channels.
 */
export async function resolveGuildBotChannels(
    guildId: string,
    _userVoiceChannel?: VoiceBasedChannel | null,
    clients?: BotClients,
): Promise<ChannelMap> {
    const result: ChannelMap = {};

    let activeClients = clients;
    if (!activeClients) {
        try {
            const indexModule = await import("../index");
            activeClients = indexModule.clients;
        } catch {
            // Fallback if imported before clients initialization
        }
    }

    const { ataque, defensa } = activeClients || {};

    // 1. Resolve Ataque voice channel
    if (ataque?.isReady()) {
        const guildAtaque = ataque.guilds.cache.get(guildId);
        if (guildAtaque) {
            try {
                const channels = await guildAtaque.channels.fetch();
                const channelList = Array.from(channels.values());
                const voiceChannels = channelList.filter(
                    (c): c is VoiceBasedChannel => c?.isVoiceBased() ?? false,
                );

                const target = findMatchingVoiceChannel(voiceChannels, env.ATAQUE_CANAL);
                if (target) {
                    result.ataque = target;
                }
            } catch (error) {
                logger.error(error, "Failed to resolve Ataque voice channel");
            }
        }
    }

    // 2. Resolve Defensa voice channel
    if (defensa?.isReady()) {
        const guildDefensa = defensa.guilds.cache.get(guildId);
        if (guildDefensa) {
            try {
                const channels = await guildDefensa.channels.fetch();
                const channelList = Array.from(channels.values());
                const voiceChannels = channelList.filter(
                    (c): c is VoiceBasedChannel => c?.isVoiceBased() ?? false,
                );

                const target = findMatchingVoiceChannel(voiceChannels, env.DEFENSA_CANAL);
                if (target) {
                    result.defensa = target;
                }
            } catch (error) {
                logger.error(error, "Failed to resolve Defensa voice channel");
            }
        }
    }

    return result;
}
