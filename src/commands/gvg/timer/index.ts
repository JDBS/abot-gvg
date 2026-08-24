import { MessageFlags, SlashCommandSubcommandGroupBuilder } from "discord.js";
import type { GvgSubcommandGroup } from "../types";
import { timerSubcommands } from "./registry";

const builder = new SlashCommandSubcommandGroupBuilder()
    .setName("timer")
    .setDescription("Timer utilities");

for (const subcommand of timerSubcommands.values()) {
    builder.addSubcommand(subcommand.data);
}

export const timerGroup: GvgSubcommandGroup = {
    data: builder,

    async execute(interaction) {
        const subcommandName = interaction.options.getSubcommand();
        const subcommand = timerSubcommands.get(subcommandName);

        if (!subcommand) {
            await interaction.reply({
                content: "Unknown timer command.",
                ephemeral: true,
            });
            return;
        }

        await subcommand.execute(interaction);
    },
};
