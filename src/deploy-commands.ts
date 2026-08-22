import { REST, Routes } from "discord.js";
import { commands } from "./commands";
import { env } from "./config";
import { logger } from "./utils/logger";

const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

const commandList = commands.map((command) => command.data.toJSON());

try {
    if (env.GUILD_ID && env.GUILD_ID !== "123") {
        logger.info(`Deploying ${commands.size} commands to guild ${env.GUILD_ID}...`);
        await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID), {
            body: commandList,
        });
        logger.info("Guild commands deployed successfully.");
    } else {
        logger.info(`Deploying ${commands.size} commands globally...`);
        await rest.put(Routes.applicationCommands(env.CLIENT_ID), {
            body: commandList,
        });
        logger.info("Global commands deployed successfully.");
    }
} catch (_error) {
    logger.warn(
        "Failed to deploy guild commands. Attempting global command deployment fallback...",
    );
    try {
        await rest.put(Routes.applicationCommands(env.CLIENT_ID), {
            body: commandList,
        });
        logger.info("Global commands deployed successfully.");
    } catch (globalError) {
        logger.error(globalError, "Failed to deploy commands to Discord.");
    }
}
