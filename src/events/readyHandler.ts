import type { Client, VoiceBasedChannel } from "discord.js";
import { ttsService } from "../services/tts";
import { logger } from "../utils/logger";

/**
 * Handles the client ready event: logs bot connection and auto-joins the first available
 * general voice channel in cached guilds to greet users.
 *
 * @param client - The connected Discord client instance.
 */
export const handleClientReady = async (client: Client<true>): Promise<void> => {
    logger.info(`Logged in as ${client.user.tag}`);

    for (const [, guild] of client.guilds.cache) {
        try {
            const channels = await guild.channels.fetch();
            const voiceChannels = channels.filter(
                (c): c is VoiceBasedChannel => c?.isVoiceBased() ?? false,
            );

            const generalVoice =
                voiceChannels.find((c) => c.name.toLowerCase().includes("general")) ??
                voiceChannels.first();

            if (generalVoice) {
                logger.info(
                    `Auto-joining voice channel "${generalVoice.name}" in guild "${guild.name}" and speaking "Hola!"`,
                );
                await ttsService.speak(generalVoice, "Hola!");
                break;
            }
        } catch (error) {
            logger.error(error, `Failed to auto-join general voice channel in guild ${guild.name}`);
        }
    }
};
