/**
 * Configuration module validating environment variables with Zod.
 */

import "dotenv/config";
import { z } from "zod";

/**
 * Zod schema for application environment variable validation.
 */
export const envSchema = z.object({
    /** Main Discord Bot Token (fallback for Ataque) */
    DISCORD_TOKEN: z.string().min(1).default("dummy-token"),
    /** Main Discord Bot Client ID (fallback for Ataque) */
    CLIENT_ID: z.string().min(1).default("dummy-client-id"),
    /** Discord Token for Bot de Ataque */
    DISCORD_TOKEN_ATAQUE: z
        .string()
        .min(1)
        .default(process.env.DISCORD_TOKEN || "dummy-token-ataque"),
    /** Discord Client ID for Bot de Ataque */
    CLIENT_ID_ATAQUE: z
        .string()
        .min(1)
        .default(process.env.CLIENT_ID || "dummy-client-id-ataque"),
    /** Discord Token for Bot de Defensa */
    DISCORD_TOKEN_DEFENSA: z.string().min(1).default("dummy-token-defensa"),
    /** Discord Client ID for Bot de Defensa */
    CLIENT_ID_DEFENSA: z.string().min(1).default("dummy-client-id-defensa"),
    /** Target voice channel name for Bot de Ataque */
    ATAQUE_CANAL: z.string().default("Invitados"),
    /** Target voice channel name for Bot de Defensa */
    DEFENSA_CANAL: z.string().default("General"),
    /** Default Discord Guild/Server ID */
    GUILD_ID: z.string().min(1).default("dummy-guild-id"),
    /** Guild ID for Bot de Ataque */
    GUILD_ID_ATAQUE: z
        .string()
        .min(1)
        .default(process.env.GUILD_ID || "dummy-guild-id-ataque"),
    /** Guild ID for Bot de Defensa */
    GUILD_ID_DEFENSA: z.string().min(1).default("dummy-guild-id-defensa"),
    /** Application execution environment */
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    /** Default language code for TTS */
    DEFAULT_LANGUAGE: z
        .string()
        .default("es")
        .transform((val) => val.trim().toLowerCase()),
    /** Port number for HTTP API Server */
    PORT: z.coerce.number().default(3000),
    /** Identification token required for HTTP API POST requests */
    CLIENT_EVENT_TOKEN: z.string().min(1).default("averno_secret_client_token"),
    /** Playback speed multiplier for TTS */
    TTS_SPEED: z.coerce.number().default(1.0),
});

/**
 * Validated environment variables configuration object.
 */
export const env = envSchema.parse(process.env);
