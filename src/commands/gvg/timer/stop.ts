import { SlashCommandSubcommandBuilder } from "discord.js";
import { eventHandler } from "../../../events";
import type { GvgSubcommand } from "../types";

export const stopTimer: GvgSubcommand = {
    data: new SlashCommandSubcommandBuilder().setName("stop").setDescription("Stops a GvG timer"),

    async execute(interaction) {
        if (interaction.guildId) {
            eventHandler.stop(interaction.guildId);
        }
        await interaction.reply("Stopping GvG timer.");
    },
};
