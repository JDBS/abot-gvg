import {
    Client,
    Events,
    GatewayIntentBits,
    MessageFlags,
    type VoiceBasedChannel,
} from "discord.js";
import { commands } from "./commands";
import { env } from "./config";
import { ttsService } from "./services/tts";
import { logger } from "./utils/logger";

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});




client.once(Events.ClientReady, async (readyClient) => {
    logger.info(`Logged in as ${readyClient.user.tag}`);

    for (const [, guild] of readyClient.guilds.cache) {
        try {
            const channels = await guild.channels.fetch();
            const voiceChannels = channels.filter(
                (c): c is VoiceBasedChannel => c?.isVoiceBased() ?? false,
            );

            const generalVoice =
                voiceChannels.find((c) => c.name.toLowerCase().includes("general")) ??
                voiceChannels.first();

            if (generalVoice) {
                logger.info(
                    `Auto-joining voice channel "${generalVoice.name}" in guild "${guild.name}" and speaking "Hello"`,
                );
                await ttsService.speak(generalVoice, "Hola!");
                break;
            }
        } catch (error) {
            logger.error(error, `Failed to auto-join general voice channel in guild ${guild.name}`);
        }
    }
});




client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) {
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error(error, "Command failed");

        await interaction.reply({
            content: "Something went wrong while running this command.",
            flags: [MessageFlags.Ephemeral],
        });
    }
});

await client.login(env.DISCORD_TOKEN);
