import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    DISCORD_TOKEN: z.string().min(1).default("dummy-token"),
    CLIENT_ID: z.string().min(1).default("dummy-client-id"),
    GUILD_ID: z.string().min(1).default("dummy-guild-id"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DEFAULT_LANGUAGE: z.string().default("es"),
    PORT: z.coerce.number().default(3000),
    CLIENT_EVENT_TOKEN: z.string().min(1).default("averno_secret_client_token"),
});

export const env = envSchema.parse(process.env);
