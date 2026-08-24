import {
    type ChatInputCommandInteraction,
    type GuildMember,
    MessageFlags,
    SlashCommandBuilder,
} from "discord.js";
import { env } from "../../config";
import { ttsService } from "../../services/tts";

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
        subcommand.setName("join").setDescription("Joins your current voice channel"),
    )
    .addSubcommand((subcommand) =>
        subcommand.setName("leave").setDescription("Leaves the voice channel"),
    )
    .addSubcommand((subcommand) =>
        subcommand.setName("stop").setDescription("Stops speaking and clears the speech queue"),
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
        const voiceChannel = member?.voice?.channel;

        switch (subcommand) {
            case "speak": {
                if (!voiceChannel) {
                    await interaction.reply({
                        content: "You must be in a voice channel to use `/tts speak`!",
                        flags: [MessageFlags.Ephemeral],
                    });
                    return;
                }

                const message = interaction.options.getString("message", true);
                const lang = interaction.options.getString("language") ?? env.DEFAULT_LANGUAGE;
                const slow = interaction.options.getBoolean("slow") ?? false;

                await interaction.deferReply();

                try {
                    await ttsService.speak(voiceChannel, message, { lang, slow });
                    await interaction.editReply({
                        content: `🗣️ Playing message: **"${message}"** (${lang.toUpperCase()})`,
                    });
                } catch (error) {
                    await interaction.editReply({
                        content: `❌ Failed to play TTS: ${error instanceof Error ? error.message : "Unknown error"}`,
                    });
                }
                break;
            }

            case "join": {
                if (!voiceChannel) {
                    await interaction.reply({
                        content: "You must be in a voice channel for the bot to join!",
                        flags: [MessageFlags.Ephemeral],
                    });
                    return;
                }

                await interaction.deferReply();
                try {
                    await ttsService.joinChannel(voiceChannel);
                    await interaction.editReply({
                        content: `🔊 Joined voice channel **${voiceChannel.name}**.`,
                    });
                } catch (error) {
                    await interaction.editReply({
                        content: `❌ Failed to join voice channel: ${error instanceof Error ? error.message : "Unknown error"}`,
                    });
                }
                break;
            }

            case "leave": {
                ttsService.leave(interaction.guildId);
                await interaction.reply({
                    content: "👋 Left the voice channel.",
                });
                break;
            }

            case "stop": {
                ttsService.stop(interaction.guildId);
                await interaction.reply({
                    content: "🛑 Stopped TTS playback and cleared queue.",
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
