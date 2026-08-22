import { Collection } from "discord.js";

import { gvgCommand } from "./gvg";
import { ttsCommand } from "./tts";

export const commands = new Collection([
    [gvgCommand.data.name, gvgCommand],
    [ttsCommand.data.name, ttsCommand],
]);
