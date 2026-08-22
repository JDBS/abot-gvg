import { SlashCommandSubcommandBuilder, type VoiceBasedChannel } from "discord.js";
import { eventHandler } from "../../../events";
import type { GvgSubcommand } from "../types";

export const startTimer: GvgSubcommand = {
    data: new SlashCommandSubcommandBuilder()
        .setName("start")
        .setDescription("Starts a GvG timer")
        .addIntegerOption((option) =>
            option
                .setName("offset")
                .setDescription("Offset in seconds (+ delays, - starts ahead)")
                .setRequired(false),
        ),

    async execute(interaction) {
        const offset = interaction.options.getInteger("offset") ?? 0;

        if (!interaction.channel?.isVoiceBased()) {
            await interaction.reply({
                content: "You must run this command in a voice channel chat.",
                ephemeral: true,
            });
            return;
        }

        await eventHandler.start(interaction.channel as VoiceBasedChannel, offset);

        await interaction.reply(`Starting timer with an offset of ${offset} seconds.`);
    },
};
