import { Client, Events, GatewayIntentBits } from "discord.js";
import { env } from "./config";
import { handleInteractionCreate } from "./events/interactionHandler";
import { handleClientReady } from "./events/readyHandler";
import { startApiServer } from "./services/apiServer";
import { logger } from "./utils/logger";


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

// Conectar bots de forma independiente y resiliente
logger.info("Iniciando conexión a Discord...");

const loginAtaque = async () => {
    try {
        console.log(await clientAtaque.login(env.DISCORD_TOKEN_ATAQUE));
    } catch (error) {
        logger.error(error, "Error al iniciar sesión con el bot de Ataque");
    }
};

const loginDefensa = async () => {
    try {
        console.log(await clientDefensa.login(env.DISCORD_TOKEN_DEFENSA));
    } catch (error) {
        logger.error(error, "Error al iniciar sesión con el bot de Defensa");
    }
};

Promise.allSettled([loginAtaque(), loginDefensa()]).catch((error) => {
    logger.error(error, "Error al iniciar sesión con los bots");
});

