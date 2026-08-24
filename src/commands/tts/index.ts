import {
    type ChatInputCommandInteraction,
    type GuildMember,
    MessageFlags,
    SlashCommandBuilder,
    type VoiceBasedChannel,
} from "discord.js";
import { env } from "../../config";
import type { BotScope } from "../../events/eventSchemas";
import { ttsService } from "../../services/tts";
import { resolveGuildBotChannels } from "../../utils/channelResolver";

const LANGUAGES = [
    { name: "English", value: "en" },
    { name: "Spanish", value: "es" },
    { name: "French", value: "fr" },
    { name: "German", value: "de" },
    { name: "Italian", value: "it" },
    { name: "Portuguese", value: "pt" },
    { name: "Japanese", value: "ja" },
    { name: "Korean", value: "ko" },
    { name: "Russian", value: "ru" },
];

const SCOPES = [
    { name: "Global (Both Bots)", value: "global" },
    { name: "Ataque Bot", value: "ataque" },
    { name: "Defensa Bot", value: "defensa" },
];

const builder = new SlashCommandBuilder()
    .setName("tts")
    .setDescription("Text-To-Speech voice utilities")
    .addSubcommand((subcommand) =>
        subcommand
            .setName("speak")
            .setDescription("Converts text to speech and plays it in your voice channel")
            .addStringOption((option) =>
                option
                    .setName("message")
                    .setDescription("The message to speak out loud")
                    .setRequired(true)
                    .setMaxLength(500),
            )
            .addStringOption((option) =>
                option
                    .setName("scope")
                    .setDescription("Which bot(s) should speak (default: Global)")
                    .setRequired(false)
                    .addChoices(...SCOPES),
            )
            .addStringOption((option) =>
                option
                    .setName("language")
                    .setDescription("Language code for TTS (default: English)")
                    .setRequired(false)
                    .addChoices(...LANGUAGES),
            )
            .addBooleanOption((option) =>
                option.setName("slow").setDescription("Speak at a slower rate").setRequired(false),
            ),
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("join")
            .setDescription("Joins voice channels for Ataque and Defensa bots"),
    )
    .addSubcommand((subcommand) =>
        subcommand.setName("leave").setDescription("Leaves voice channels for all bots"),
    )
    .addSubcommand((subcommand) =>
        subcommand
            .setName("stop")
            .setDescription("Stops speaking and clears the speech queue for all bots"),
    );

export const ttsCommand = {
    data: builder,

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.guildId || !interaction.guild) {
            await interaction.reply({
                content: "This command can only be used in a server.",
                flags: [MessageFlags.Ephemeral],
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();
        const member = interaction.member as GuildMember | null;
        const voiceChannel: VoiceBasedChannel | null = interaction.channel?.isVoiceBased()
            ? interaction.channel
            : (member?.voice?.channel ?? null);

        switch (subcommand) {
            case "speak": {
                const message = interaction.options.getString("message", true);
                const scope = (interaction.options.getString("scope") as BotScope) ?? "global";
                const lang = interaction.options.getString("language") ?? env.DEFAULT_LANGUAGE;
                const slow = interaction.options.getBoolean("slow") ?? false;

                await interaction.deferReply();

                try {
                    const botChannels = await resolveGuildBotChannels(
                        interaction.guildId,
                        voiceChannel,
                    );
                    const targetChannels: VoiceBasedChannel[] = [];

                    if ((scope === "global" || scope === "ataque") && botChannels.ataque) {
                        targetChannels.push(botChannels.ataque);
                    }
                    if ((scope === "global" || scope === "defensa") && botChannels.defensa) {
                        if (scope !== "global" || botChannels.defensa !== botChannels.ataque) {
                            targetChannels.push(botChannels.defensa);
                        }
                    }

                    if (targetChannels.length === 0) {
                        await interaction.editReply({
                            content:
                                "❌ No available voice channel found for the specified bot scope.",
                        });
                        return;
                    }

                    await Promise.all(
                        targetChannels.map((ch) => ttsService.speak(ch, message, { lang, slow })),
                    );

                    const channelNames = targetChannels.map((c) => c.name).join(", ");
                    await interaction.editReply({
                        content: `🗣️ Playing message: **"${message}"** in (${channelNames}) [Scope: ${scope.toUpperCase()}]`,
                    });
                } catch (error) {
                    await interaction.editReply({
                        content: `❌ Failed to play TTS: ${error instanceof Error ? error.message : "Unknown error"}`,
                    });
                }
                break;
            }

            case "join": {
                await interaction.deferReply();
                try {
                    const botChannels = await resolveGuildBotChannels(
                        interaction.guildId,
                        voiceChannel,
                    );
                    const targetChannels: VoiceBasedChannel[] = [];
                    if (botChannels.ataque) targetChannels.push(botChannels.ataque);
                    if (botChannels.defensa && botChannels.defensa !== botChannels.ataque) {
                        targetChannels.push(botChannels.defensa);
                    }

                    if (targetChannels.length === 0) {
                        await interaction.editReply({
                            content: "❌ No voice channels found to join.",
                        });
                        return;
                    }

                    await Promise.all(targetChannels.map((ch) => ttsService.joinChannel(ch)));
                    const channelNames = targetChannels.map((c) => `**${c.name}**`).join(" & ");
                    await interaction.editReply({
                        content: `🔊 Joined voice channels: ${channelNames}.`,
                    });
                } catch (error) {
                    await interaction.editReply({
                        content: `❌ Failed to join voice channels: ${error instanceof Error ? error.message : "Unknown error"}`,
                    });
                }
                break;
            }

            case "leave": {
                ttsService.leave(interaction.guildId);
                await interaction.reply({
                    content: "👋 Left voice channels for all bots.",
                });
                break;
            }

            case "stop": {
                ttsService.stop(interaction.guildId);
                await interaction.reply({
                    content: "🛑 Stopped TTS playback and cleared queue for all bots.",
                });
                break;
            }

            default: {
                await interaction.reply({
                    content: "Unknown subcommand.",
                    flags: [MessageFlags.Ephemeral],
                });
                break;
            }
        }
    },
};
