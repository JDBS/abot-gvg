import { GuildMember, SlashCommandSubcommandBuilder, type VoiceBasedChannel } from "discord.js";
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

        const member = interaction.member as GuildMember | null;
        const voiceChannel = member?.voice?.channel;

        let targetChannel: VoiceBasedChannel | null = null;
        if (interaction.channel?.isVoiceBased()) {
            targetChannel = interaction.channel;
        } else if (voiceChannel) {
            targetChannel = voiceChannel;
        }

        if (!targetChannel) {
            await interaction.reply({
                content:
                    "You must run this command in a voice channel chat, or be connected to a voice channel.",
                ephemeral: true,
            });
            return;
        }

        await eventHandler.start(targetChannel, offset);

        await interaction.reply(`Starting timer with an offset of ${offset} seconds.`);
    },
};
