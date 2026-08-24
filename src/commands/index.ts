/**
 * Central registry of top-level Discord slash commands.
 */

import { Collection } from "discord.js";
import { gvgCommand } from "./gvg";

/**
 * Collection mapping command names to their command objects.
 */
export const commands = new Collection([[gvgCommand.data.name, gvgCommand]]);
