import type { Client, VoiceBasedChannel } from "discord.js";
import { ttsService } from "../services/tts";
import { logger } from "../utils/logger";

/**
 * Handles the client ready event: logs bot connection and auto-joins the first available
 * general voice channel in cached guilds to greet users.
 *
 * @param client - The connected Discord client instance.
 */
export const handleClientReady = async (
    client: Client<true>,
    botName?: string,
    targetChannelName?: string,
): Promise<void> => {
    const label = botName ? ` [${botName}]` : "";
    logger.info(`Logged in as ${client.user.tag}${label}`);

    for (const [, guild] of client.guilds.cache) {
        try {
            const channels = await guild.channels.fetch();
            const voiceChannels = channels.filter(
                (c): c is VoiceBasedChannel => c?.isVoiceBased() ?? false,
            );

            const targetVoice =
                (targetChannelName
                    ? (voiceChannels.find(
                          (c) => c.name.toLowerCase() === targetChannelName.toLowerCase(),
                      ) ??
                      voiceChannels.find((c) =>
                          c.name.toLowerCase().includes(targetChannelName.toLowerCase()),
                      ))
                    : undefined) ??
                voiceChannels.find((c) => c.name.toLowerCase().includes("general")) ??
                voiceChannels.first();

            if (targetVoice) {
                logger.info(
                    `Auto-joining voice channel "${targetVoice.name}" in guild "${guild.name}" and speaking "Hola!"`,
                );
                await ttsService.speak(targetVoice, "Hola!");
                break;
            }
        } catch (error) {
            logger.error(error, `Failed to auto-join voice channel in guild ${guild.name}`);
        }
    }
};
