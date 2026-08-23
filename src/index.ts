import { Client, Events, GatewayIntentBits } from "discord.js";
import { env } from "./config";
import { handleInteractionCreate } from "./events/interactionHandler";
import { handleClientReady } from "./events/readyHandler";
import { startApiServer } from "./services/apiServer";

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

client.once(Events.ClientReady, handleClientReady);
client.on(Events.InteractionCreate, handleInteractionCreate);

// Start HTTP API server for receiving client events
startApiServer(env.PORT, client);

await client.login(env.DISCORD_TOKEN);
