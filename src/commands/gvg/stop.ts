/**
 * Subcommand: /gvg stop
 * Stops the active GvG timer and disconnects voice bots.
 */

import { SlashCommandSubcommandBuilder } from "discord.js";
import { eventHandler } from "../../events";
import { ttsService } from "../../services/tts";
import type { GvgSubcommand } from "./types";

/**
 * Command definition and execution logic for /gvg stop.
 */
export const stopCommand: GvgSubcommand = {
    data: new SlashCommandSubcommandBuilder()
        .setName("stop")
        .setDescription("Detiene los eventos de GvG y desconecta los bots de voz"),

    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Este comando solo se puede usar en un servidor.",
                ephemeral: true,
            });
            return;
        }

        const guildId = interaction.guildId;

        // Destroy all scheduled events for this guild
        eventHandler.stop(guildId);

        // Disconnect both Ataque and Defensa bots from voice channels
        ttsService.leave(guildId);

        await interaction.reply(
            "🛑 **GvG Detenida.** Se han cancelado todos los eventos y se han desconectado los bots de voz.",
        );
    },
};
