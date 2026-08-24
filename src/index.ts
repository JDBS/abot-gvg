import { Client, Events, GatewayIntentBits } from "discord.js";
import { env } from "./config";
import { handleInteractionCreate } from "./events/interactionHandler";
import { handleClientReady } from "./events/readyHandler";
import { startApiServer } from "./services/apiServer";

const clientAtaque = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const clientDefensa = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

clientAtaque.once(Events.ClientReady, (c) => handleClientReady(c, "Ataque", env.ATAQUE_CANAL));
clientAtaque.on(Events.InteractionCreate, handleInteractionCreate);

clientDefensa.once(Events.ClientReady, (c) => handleClientReady(c, "Defensa", env.DEFENSA_CANAL));
clientDefensa.on(Events.InteractionCreate, handleInteractionCreate);

const clients = { ataque: clientAtaque, defensa: clientDefensa };

// Start HTTP API server for receiving client events
startApiServer(env.PORT, clients);

await Promise.all([
    clientAtaque.login(env.DISCORD_TOKEN_ATAQUE),
    clientDefensa.login(env.DISCORD_TOKEN_DEFENSA),
]);
