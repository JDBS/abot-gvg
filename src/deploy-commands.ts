import { REST, Routes } from "discord.js";
import { commands } from "./commands";
import { env } from "./config";
import { logger } from "./utils/logger";

const bots = [
    {
        name: "Ataque",
        clientId: env.CLIENT_ID_ATAQUE,
        token: env.DISCORD_TOKEN_ATAQUE,
        guildId: env.GUILD_ID_ATAQUE || env.GUILD_ID,
    },
];

const commandList = commands.map((command) => command.data.toJSON());

for (const bot of bots) {
    const rest = new REST({ version: "10" }).setToken(bot.token);

    const isDummyGuild =
        !bot.guildId ||
        bot.guildId === "123" ||
        bot.guildId === "dummy-guild-id" ||
        bot.guildId === "dummy-guild-id-ataque" ||
        bot.guildId === "dummy-guild-id-defensa";

    try {
        if (!isDummyGuild) {
            logger.info(
                `Deploying ${commands.size} commands for ${bot.name} bot to guild ${bot.guildId}...`,
            );
            await rest.put(Routes.applicationGuildCommands(bot.clientId, bot.guildId), {
                body: commandList,
            });
            logger.info(`Guild commands deployed successfully for ${bot.name} bot.`);
        } else {
            logger.info(`Deploying ${commands.size} commands globally for ${bot.name} bot...`);
            await rest.put(Routes.applicationCommands(bot.clientId), {
                body: commandList,
            });
            logger.info(`Global commands deployed successfully for ${bot.name} bot.`);
        }
    } catch (_error) {
        logger.warn(
            `Failed to deploy guild commands for ${bot.name} bot. Attempting global command deployment fallback...`,
        );
        try {
            await rest.put(Routes.applicationCommands(bot.clientId), {
                body: commandList,
            });
            logger.info(`Global commands deployed successfully for ${bot.name} bot.`);
        } catch (globalError) {
            logger.error(globalError, `Failed to deploy commands to Discord for ${bot.name} bot.`);
        }
    }
}
