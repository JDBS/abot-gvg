import { z } from "zod";

const envSchema = z.object({
    DISCORD_TOKEN: z.string().min(1),
    CLIENT_ID: z.string().min(1),
    GUILD_ID: z.string().min(1),
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    DEFAULT_LANGUAGE: z.string().default("es"),
});

export const env = envSchema.parse(process.env);
