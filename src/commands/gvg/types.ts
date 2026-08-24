/**
 * Type definitions for GvG slash subcommands.
 */

import type {
    ChatInputCommandInteraction,
    SlashCommandSubcommandBuilder,
    SlashCommandSubcommandGroupBuilder,
} from "discord.js";

/**
 * Interface representing a GvG subcommand.
 */
export interface GvgSubcommand {
    readonly data: SlashCommandSubcommandBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}

/**
 * Interface representing a GvG subcommand group.
 */
export interface GvgSubcommandGroup {
    readonly data: SlashCommandSubcommandGroupBuilder;
    execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
