import { Client, Events, GatewayIntentBits } from "discord.js";
import { env } from "./config";
import { handleInteractionCreate } from "./events/interactionHandler";
import { handleClientReady } from "./events/readyHandler";

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once(Events.ClientReady, handleClientReady);
client.on(Events.InteractionCreate, handleInteractionCreate);

await client.login(env.DISCORD_TOKEN);
