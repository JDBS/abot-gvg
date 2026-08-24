import type { Client, VoiceBasedChannel } from "discord.js";
import { ttsService } from "../services/tts";
import { findMatchingVoiceChannel } from "../utils/channelResolver";
import { logger } from "../utils/logger";

/**
 * Handles the client ready event: logs bot connection and auto-joins configured voice channel
 * in cached guilds to greet users.
 *
 * @param client - The connected Discord client instance.
 * @param botName - Optional label for the bot ("Ataque" or "Defensa").
 * @param targetChannelName - Optional target channel name to search and auto-connect.
 */
export const handleClientReady = async (
    client: Client<true>,
    botName?: string,
    targetChannelName?: string,
): Promise<void> => {
    const label = botName ? ` [${botName}]` : "";
    logger.info(`Logged in as ${client.user.tag}`);

    if (client.guilds.cache.size === 0) {
        logger.warn(
            `Bot${label} está conectado a la API de Discord pero NO está presente en ningún servidor (servidores: 0). ¡Asegúrate de invitar este bot a tu servidor de Discord con el enlace OAuth2!`,
        );
        return;
    }

    logger.info(`Bot${label} está conectado a ${client.guilds.cache.size} servidor(es).`);

    for (const [, guild] of client.guilds.cache) {
        try {
            const channels = await guild.channels.fetch();
            const voiceChannels = Array.from(channels.values()).filter(
                (c): c is VoiceBasedChannel =>
                    Boolean(c && typeof c.isVoiceBased === "function" && c.isVoiceBased() && c.client === client),
            );

            const targetVoiceChannel = targetChannelName
                ? findMatchingVoiceChannel(voiceChannels, targetChannelName)
                : null;

            if (targetVoiceChannel) {
                logger.info(
                    `Auto-conectando canal de voz "${targetVoiceChannel.name}" en servidor "${guild.name}" para bot${label} y reproduciendo "Hola!"`,
                );
                await ttsService.speak(targetVoiceChannel, "Hola!");
                break;
            } else {
                logger.warn(
                    `No se encontró un canal de voz adecuado en el servidor "${guild.name}" para el bot${label}.`,
                );
            }
        } catch (error) {
            logger.error(
                error,
                `Fallo al auto-conectar al canal de voz en el servidor "${guild.name}" para bot${label}`,
            );
        }
    }
};
