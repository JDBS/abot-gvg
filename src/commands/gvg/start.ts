import {
    type GuildMember,
    SlashCommandSubcommandBuilder,
    type VoiceBasedChannel,
} from "discord.js";
import { eventHandler } from "../../events";
import { resolveGuildBotChannels } from "../../utils/channelResolver";
import { secondsToString } from "../../utils/timeConversion";
import type { GvgSubcommand } from "./types";

export const startCommand: GvgSubcommand = {
    data: new SlashCommandSubcommandBuilder()
        .setName("start")
        .setDescription("Inicia la GvG en t=30m (conectando los bots a sus canales)"),

    async execute(interaction) {
        if (!interaction.guildId) {
            await interaction.reply({
                content: "Este comando solo se puede usar en un servidor.",
                ephemeral: true,
            });
            return;
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

        // Initialize offset to 0 (t = 30m) on /gvg start
        const offset = 0;
        eventHandler.setGuildOffset(interaction.guildId, offset);
        await eventHandler.start(channels, offset);

        const channelNames: string[] = [];
        if (channels.ataque) channelNames.push(`Ataque: **${channels.ataque.name}**`);
        if (channels.defensa) channelNames.push(`Defensa: **${channels.defensa.name}**`);

        const initialTimeString = secondsToString(1800);

        await interaction.reply(
            `🎮 **GvG Iniciada** (t = **${initialTimeString}**)\n📢 Canales conectados -> ${channelNames.join(" | ")}`,
        );
    },
};
