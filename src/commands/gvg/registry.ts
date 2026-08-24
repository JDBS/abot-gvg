import { Collection } from "discord.js";
import { offsetCommand } from "./offset";
import { ping } from "./ping";
import { startCommand } from "./start";
import { stopCommand } from "./stop";
import type { GvgSubcommand } from "./types";

export const subcommands = new Collection<string, GvgSubcommand>([
    [startCommand.data.name, startCommand],
    [offsetCommand.data.name, offsetCommand],
    [stopCommand.data.name, stopCommand],
    [ping.data.name, ping],
]);
