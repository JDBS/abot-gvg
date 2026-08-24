/**
 * Subcommand: /gvg offset
 * Configures time offset for GvG timer.
 */

import { SlashCommandSubcommandBuilder } from "discord.js";
import { eventHandler } from "../../events";
import { parseOffsetInput, secondsToString } from "../../utils/timeConversion";
import type { GvgSubcommand } from "./types";

/**
 * Command definition and execution logic for /gvg offset.
 */
export const offsetCommand: GvgSubcommand = {
    data: new SlashCommandSubcommandBuilder()
        .setName("offset")
        .setDescription("Establece un offset de tiempo para la GvG")
        .addStringOption((option) =>
            option
                .setName("tiempo")
                .setDescription("Tiempo u offset (ej. 35m, 5m, +5m, -2m, 300s)")
                .setRequired(true),
        ),

    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Este comando solo se puede usar en un servidor.",
                ephemeral: true,
            });
            return;
        }

        const tiempoInput = interaction.options.getString("tiempo", true);

        try {
            const offsetSeconds = parseOffsetInput(tiempoInput);
            const guildId = interaction.guildId;

            eventHandler.setGuildOffset(guildId, offsetSeconds);

            const initialTimeSeconds = 1800 + offsetSeconds;
            const initialTimeString = secondsToString(Math.max(0, initialTimeSeconds));
            const offsetDesc = offsetSeconds >= 0 ? `+${offsetSeconds}s` : `${offsetSeconds}s`;

            let statusMessage = `⏱️ **Offset configurado:** ${offsetDesc} (Inicio de GvG en t = **${initialTimeString}**)`;

            // If timer is already running, re-apply the offset
            if (eventHandler.isRunning(guildId)) {
                const activeChannels = eventHandler.getActiveChannels(guildId);
                if (activeChannels) {
                    await eventHandler.start(activeChannels, offsetSeconds);
                    statusMessage +=
                        "\n🔄 Temporizador de GvG actualizado en ejecución con el nuevo offset.";
                }
            }

            await interaction.reply(statusMessage);
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Formato de tiempo inválido.";
            await interaction.reply({
                content: `❌ Error al establecer el offset: ${errorMsg}`,
                ephemeral: true,
            });
        }
    },
};
