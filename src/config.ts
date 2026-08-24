import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    DISCORD_TOKEN: z.string().min(1).default("dummy-token"),
    CLIENT_ID: z.string().min(1).default("dummy-client-id"),
    DISCORD_TOKEN_ATAQUE: z
        .string()
        .min(1)
        .default(process.env.DISCORD_TOKEN || "dummy-token-ataque"),
    CLIENT_ID_ATAQUE: z
        .string()
        .min(1)
        .default(process.env.CLIENT_ID || "dummy-client-id-ataque"),
    DISCORD_TOKEN_DEFENSA: z.string().min(1).default("dummy-token-defensa"),
    CLIENT_ID_DEFENSA: z.string().min(1).default("dummy-client-id-defensa"),
    ATAQUE_CANAL: z.string().default("Invitados"),
    DEFENSA_CANAL: z.string().default("General"),
    GUILD_ID: z.string().min(1).default("dummy-guild-id"),
    GUILD_ID_ATAQUE: z
        .string()
        .min(1)
        .default(process.env.GUILD_ID || "dummy-guild-id-ataque"),
    GUILD_ID_DEFENSA: z.string().min(1).default("dummy-guild-id-defensa"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DEFAULT_LANGUAGE: z
        .string()
        .default("es")
        .transform((val) => val.trim().toLowerCase()), // Remove whitespace and convert to lowercase
    PORT: z.coerce.number().default(3000),
    CLIENT_EVENT_TOKEN: z.string().min(1).default("averno_secret_client_token"),
    TTS_SPEED: z.coerce.number().default(1.0),
});

export const env = envSchema.parse(process.env);
