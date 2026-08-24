/**
 * Subcommand: /gvg ping
 * Health check command returning Pong response.
 */

import { SlashCommandSubcommandBuilder } from "discord.js";
import type { GvgSubcommand } from "./types";

/**
 * Command definition and execution logic for /gvg ping.
 */
export const ping: GvgSubcommand = {
    data: new SlashCommandSubcommandBuilder().setName("ping").setDescription("Replies with Pong!"),

    async execute(interaction) {
        await interaction.reply("🏓 Pong!");
    },
};
