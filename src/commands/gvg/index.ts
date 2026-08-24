/**
 * Root definition for the /gvg slash command.
 */

import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { subcommands } from "./registry";

const builder = new SlashCommandBuilder().setName("gvg").setDescription("Guild vs Guild utilities");

for (const command of subcommands.values()) {
    builder.addSubcommand(command.data);
}

/**
 * Main /gvg slash command definition and subcommand router.
 */
export const gvgCommand = {
    data: builder,

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const subcommandName = interaction.options.getSubcommand();
        const subcommand = subcommands.get(subcommandName);

        if (!subcommand) {
            await interaction.reply({
                content: "Desconocido subcomando.",
                flags: [MessageFlags.Ephemeral],
            });
            return;
        }

        await subcommand.execute(interaction);
    },
};
