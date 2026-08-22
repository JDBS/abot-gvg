import { type Interaction, MessageFlags } from "discord.js";
import { commands } from "../commands";
import { logger } from "../utils/logger";

/**
 * Handles incoming InteractionCreate events by resolving slash commands from registry.
 *
 * @param interaction - The incoming Discord interaction.
 */
export const handleInteractionCreate = async (interaction: Interaction): Promise<void> => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) {
        logger.warn(`Received unregistered command: ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error(error, `Command "${interaction.commandName}" failed`);

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: "Something went wrong while running this command.",
                flags: [MessageFlags.Ephemeral],
            });
        } else {
            await interaction.reply({
                content: "Something went wrong while running this command.",
                flags: [MessageFlags.Ephemeral],
            });
        }
    }
};
