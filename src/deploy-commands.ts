/**
 * Deployment script for registering Discord slash commands.
 * Connects to Discord REST API and deploys commands either guild-scoped or globally.
 */

import { REST, Routes } from "discord.js";
import { commands } from "./commands";
import { env } from "./config";
import { logger } from "./utils/logger";

/**
 * Pure function that checks whether a given guild ID is a placeholder/dummy value.
 *
 * @param guildId - The Discord guild ID string to check.
 * @returns True if guild ID is empty or matches dummy default identifiers.
 */
export function isDummyGuildId(guildId?: string): boolean {
    if (!guildId) return true;
    const dummyIds = new Set([
        "123",
        "dummy-guild-id",
        "dummy-guild-id-ataque",
        "dummy-guild-id-defensa",
    ]);
    return dummyIds.has(guildId.trim());
}

function getBots() {
    return [
        {
            name: "Ataque",
            clientId: env.CLIENT_ID_ATAQUE,
            token: env.DISCORD_TOKEN_ATAQUE,
            guildId: env.GUILD_ID_ATAQUE || env.GUILD_ID,
        },
        {
            name: "Defensa",
            clientId: env.CLIENT_ID_DEFENSA,
            token: env.DISCORD_TOKEN_DEFENSA,
            guildId: env.GUILD_ID_DEFENSA || env.GUILD_ID,
        },
    ];
}

/**
 * Clears registered slash commands (both global and guild-scoped) for configured Discord bots.
 */
export async function clearCommands(): Promise<void> {
    const bots = getBots();

    for (const bot of bots) {
        if (!bot.token || !bot.clientId) continue;
        const rest = new REST({ version: "10" }).setToken(bot.token);

        logger.info(`Clearing global commands for ${bot.name} bot...`);
        try {
            await rest.put(Routes.applicationCommands(bot.clientId), { body: [] });
            logger.info(`Global commands cleared for ${bot.name} bot.`);
        } catch (error) {
            logger.error(error, `Failed to clear global commands for ${bot.name} bot.`);
        }

        if (!isDummyGuildId(bot.guildId) && bot.guildId) {
            logger.info(`Clearing guild commands for ${bot.name} bot in guild ${bot.guildId}...`);
            try {
                await rest.put(Routes.applicationGuildCommands(bot.clientId, bot.guildId), {
                    body: [],
                });
                logger.info(`Guild commands cleared for ${bot.name} bot.`);
            } catch (error) {
                logger.error(error, `Failed to clear guild commands for ${bot.name} bot.`);
            }
        }
    }
}

/**
 * Deploys slash commands for configured Discord bots (only Bot de Ataque).
 * If clean flag is specified, clears existing commands from all bots before deploying.
 */
export async function deployCommands(options?: { clean?: boolean }): Promise<void> {
    if (options?.clean) {
        await clearCommands();
    }

    // Commands are deployed exclusively for the Ataque bot
    const botsToDeploy = [
        {
            name: "Ataque",
            clientId: env.CLIENT_ID_ATAQUE,
            token: env.DISCORD_TOKEN_ATAQUE,
            guildId: env.GUILD_ID_ATAQUE || env.GUILD_ID,
        },
    ];

    const commandList = commands.map((command) => command.data.toJSON());

    for (const bot of botsToDeploy) {
        const rest = new REST({ version: "10" }).setToken(bot.token);
        const isDummy = isDummyGuildId(bot.guildId);

        try {
            if (!isDummy && bot.guildId) {
                logger.info(`Deploying ${commands.size} commands for ${bot.name} bot to guild...`);
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
                logger.error(
                    globalError,
                    `Failed to deploy commands to Discord for ${bot.name} bot.`,
                );
            }
        }
    }
}

// Execute deployment if run directly as main script
const scriptArg = process.argv[1]?.replace(/\\/g, "/");
const isDirectRun =
    scriptArg &&
    (scriptArg.endsWith("/deploy-commands.ts") ||
        scriptArg.endsWith("/deploy-commands.js") ||
        scriptArg.endsWith("/deploy-commands"));
if (isDirectRun) {
    const shouldClean = process.argv.includes("--clean") || process.argv.includes("--clear");
    await deployCommands({ clean: shouldClean });
}
