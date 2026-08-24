import type { Client, VoiceBasedChannel } from "discord.js";
import { env } from "../config";
import type { ChannelMap } from "../events/eventHandler";
import { logger } from "./logger";

export interface BotClients {
    ataque?: Client;
    defensa?: Client;
}

/**
 * Resolves the voice channels for Bot de Ataque and Bot de Defensa for a given guild ID.
 * Ensures that each resolved VoiceBasedChannel object belongs to the respective Discord client,
 * so that VoiceConnection's group parameter is correctly set to client.user.id.
 */
export async function resolveGuildBotChannels(
    guildId: string,
    userVoiceChannel?: VoiceBasedChannel | null,
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

                const target =
                    voiceChannels.find(
                        (c) => c.name.toLowerCase() === env.ATAQUE_CANAL.toLowerCase(),
                    ) ??
                    voiceChannels.find((c) =>
                        c.name.toLowerCase().includes(env.ATAQUE_CANAL.toLowerCase()),
                    );

                console.log(`userVoiceChannel: ${userVoiceChannel}`);
                console.log(`target: ${target}`);
                console.log(`voiceChannels: ${voiceChannels.length}`);

                if (target) {
                    result.ataque = target;
                }
            } catch (error) {
                logger.error(error, `Failed to resolve Ataque voice channel for guild ${guildId}`);
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

                const target =
                    voiceChannels.find(
                        (c) => c.name.toLowerCase() === env.DEFENSA_CANAL.toLowerCase(),
                    ) ??
                    voiceChannels.find((c) =>
                        c.name.toLowerCase().includes(env.DEFENSA_CANAL.toLowerCase()),
                    );

                console.log(`userVoiceChannel: ${userVoiceChannel}`);
                console.log(`target: ${target}`);
                console.log(`voiceChannels: ${voiceChannels.length}`);
                if (target) {
                    result.defensa = target;
                }
            } catch (error) {
                logger.error(error, `Failed to resolve Defensa voice channel for guild ${guildId}`);
            }
        }
    }

    return result;
}
