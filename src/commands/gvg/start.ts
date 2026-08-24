/**
 * Subcommand: /gvg start
 * Starts the GvG countdown timer sequence from t=30m.
 */

import {
    type GuildMember,
    SlashCommandSubcommandBuilder,
    type VoiceBasedChannel,
} from "discord.js";
import { eventHandler } from "../../events";
import { resolveGuildBotChannels } from "../../utils/channelResolver";
import { parseOffsetInput, secondsToString } from "../../utils/timeConversion";
import type { GvgSubcommand } from "./types";

/**
 * Command definition and execution logic for /gvg start.
 */
export const startCommand: GvgSubcommand = {
    data: new SlashCommandSubcommandBuilder()
        .setName("start")
        .setDescription("Inicia la GvG en t=30m por defecto o con un offset opcional")
        .addStringOption((option) =>
            option
                .setName("offset")
                .setDescription("Tiempo u offset opcional (ej. 35m, 5m, +5m, -2m, 300s)")
                .setRequired(false),
        ),

    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Este comando solo se puede usar en un servidor.",
                ephemeral: true,
            });
            return;
        }

        const offsetInput =
            interaction.options.getString("offset") ?? interaction.options.getString("tiempo");

        let offset = 0;
        if (offsetInput) {
            try {
                offset = parseOffsetInput(offsetInput);
            } catch (error) {
                const errorMsg =
                    error instanceof Error ? error.message : "Formato de tiempo inválido.";
                await interaction.reply({
                    content: `❌ Error al establecer el offset: ${errorMsg}`,
                    ephemeral: true,
                });
                return;
            }
        }

        const member = interaction.member as GuildMember | null;
        const voiceChannel: VoiceBasedChannel | null = interaction.channel?.isVoiceBased()
            ? interaction.channel
            : (member?.voice?.channel ?? null);

        const channels = await resolveGuildBotChannels(interaction.guildId, voiceChannel);

        if (!channels.ataque && !channels.defensa) {
            await interaction.reply({
                content:
                    "No se encontraron canales de voz para los bots de Ataque o Defensa en este servidor.",
                ephemeral: true,
            });
            return;
        }

        eventHandler.setGuildOffset(interaction.guildId, offset);
        await eventHandler.start(channels, offset);

        const channelNames: string[] = [];
        if (channels.ataque) channelNames.push(`Ataque: **${channels.ataque.name}**`);
        if (channels.defensa) channelNames.push(`Defensa: **${channels.defensa.name}**`);

        const initialTimeSeconds = 1800 + offset;
        const initialTimeString = secondsToString(Math.max(0, initialTimeSeconds));

        await interaction.reply(
            `🎮 **GvG Iniciada** (t = **${initialTimeString}**)\n📢 Canales conectados -> ${channelNames.join(" | ")}`,
        );
    },
};
