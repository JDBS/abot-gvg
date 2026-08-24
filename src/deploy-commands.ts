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

/**
 * Deploys slash commands for configured Discord bots.
 */
export async function deployCommands(): Promise<void> {
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
                logger.error(globalError, `Failed to deploy commands to Discord for ${bot.name} bot.`);
            }
        }
    }
}

// Execute deployment if run directly as main script
await deployCommands();
