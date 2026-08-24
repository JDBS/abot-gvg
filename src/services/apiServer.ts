import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer, type Server } from "node:http";
import type { Client, VoiceBasedChannel } from "discord.js";
import { env } from "../config";
import { clientEventSchema } from "../events/clientEventSchemas";
import type { BotScope } from "../events/eventSchemas";
import { logger } from "../utils/logger";
import { ttsService } from "./tts";

export interface BotClients {
    ataque?: Client;
    defensa?: Client;
}

export interface ApiServerInstance {
    server: Server;
    stop: () => Promise<void>;
}

/**
 * Resolves target Discord clients matching the specified scope.
 */
function getTargetClients(clients?: BotClients | Client, scope: BotScope = "global"): Client[] {
    if (!clients) return [];

    // Backwards compatibility if a single Client is passed
    if ("guilds" in clients) {
        return [clients];
    }

    const targetList: Client[] = [];
    if ((scope === "global" || scope === "ataque") && clients.ataque) {
        targetList.push(clients.ataque);
    }
    if ((scope === "global" || scope === "defensa") && clients.defensa) {
        targetList.push(clients.defensa);
    }

    return targetList;
}

/**
 * Handles incoming client events received via POST request.
 *
 * @param eventName - The event identifier (e.g., "key_press").
 * @param value - The string message/value associated with the event.
 * @param clients - Optional Discord client(s) instance or BotClients map.
 * @param scope - The bot scope ("global", "ataque", "defensa"). Defaults to "global".
 */
export async function handleClientEvent(
    eventName: string,
    value: string,
    clients?: BotClients | Client,
    scope: BotScope = "global",
): Promise<{ processed: boolean; detail?: string }> {
    logger.info(
        `Processing client event: "${eventName}" with value: "${value}" and scope: "${scope}"`,
    );

    switch (eventName) {
        case "key_press": {
            logger.info(`Global hotkey event received: "${value}" (Scope: ${scope})`);
            const ttsText = String(value);
            const targetClients = getTargetClients(clients, scope);

            if (targetClients.length > 0) {
                const speakPromises = targetClients.map(async (client) => {
                    const preferredChannel =
                        typeof clients === "object" &&
                        "ataque" in clients &&
                        client === clients.ataque
                            ? env.ATAQUE_CANAL
                            : typeof clients === "object" &&
                                "defensa" in clients &&
                                client === clients.defensa
                              ? env.DEFENSA_CANAL
                              : undefined;

                    if (client.guilds.cache.size > 0) {
                        for (const [, guild] of client.guilds.cache) {
                            try {
                                const channels = await guild.channels.fetch();
                                const voiceChannels = channels.filter(
                                    (c): c is VoiceBasedChannel => c?.isVoiceBased() ?? false,
                                );

                                const voiceChannel =
                                    voiceChannels.find((c) =>
                                        c.members.has(client.user?.id || ""),
                                    ) ??
                                    (preferredChannel
                                        ? (voiceChannels.find(
                                              (c) =>
                                                  c.name.toLowerCase() ===
                                                  preferredChannel.toLowerCase(),
                                          ) ??
                                          voiceChannels.find((c) =>
                                              c.name
                                                  .toLowerCase()
                                                  .includes(preferredChannel.toLowerCase()),
                                          ))
                                        : undefined) ??
                                    voiceChannels.find((c) =>
                                        c.name.toLowerCase().includes("general"),
                                    ) ??
                                    voiceChannels.first();

                                if (voiceChannel) {
                                    logger.info(
                                        `Speaking TTS message "${ttsText}" in voice channel "${voiceChannel.name}" (Guild: "${guild.name}", Scope: ${scope})`,
                                    );
                                    await ttsService.speak(voiceChannel, ttsText);
                                    return true;
                                }
                            } catch (error) {
                                logger.error(error, `Failed to trigger TTS in guild ${guild.name}`);
                            }
                        }
                    }
                    return false;
                });

                const results = await Promise.all(speakPromises);
                const spokenCount = results.filter(Boolean).length;

                if (spokenCount === 0) {
                    logger.warn("No available voice channel found for TTS execution.");
                }
            } else {
                logger.warn("Discord client not connected or no active guilds available for TTS.");
            }

            return { processed: true, detail: `Event "${ttsText}" read via TTS` };
        }
        default:
            logger.info(`Received generic client event "${eventName}" with value "${value}"`);
            return { processed: true, detail: `Event ${eventName} logged` };
    }
}

/**
 * Creates and starts the HTTP API server for client application communication.
 *
 * @param port - The port number to listen on (defaults to config PORT or 3000).
 * @param discordClients - Optional active Discord client(s) instance or BotClients map.
 * @returns Object with the HTTP server instance and a stop method.
 */
export function startApiServer(
    port: number = env.PORT || 3000,
    discordClients?: BotClients | Client,
): ApiServerInstance {
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        // Set standard CORS headers
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");

        // Handle OPTIONS pre-flight request
        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }

        const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

        // Route: /api/action
        if (url.pathname === "/api/action") {
            if (req.method === "GET") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(
                    JSON.stringify({
                        success: true,
                        status: "online",
                        message: "AvernoBot API active",
                        timestamp: new Date().toISOString(),
                    }),
                );
                return;
            }

            if (req.method === "POST") {
                let bodyRaw = "";
                req.on("data", (chunk) => {
                    bodyRaw += chunk;
                });

                req.on("end", async () => {
                    try {
                        let parsedBody: unknown = {};
                        if (bodyRaw.trim().length > 0) {
                            parsedBody = JSON.parse(bodyRaw);
                        }

                        const eventData = clientEventSchema.parse(parsedBody);

                        if (eventData.token !== env.CLIENT_EVENT_TOKEN) {
                            logger.warn(`Unauthorized event token received: "${eventData.token}"`);
                            res.writeHead(401, { "Content-Type": "application/json" });
                            res.end(
                                JSON.stringify({
                                    success: false,
                                    error: "Unauthorized: Invalid identification token",
                                }),
                            );
                            return;
                        }

                        const result = await handleClientEvent(
                            eventData.event,
                            eventData.value,
                            discordClients,
                            eventData.scope,
                        );

                        res.writeHead(200, { "Content-Type": "application/json" });
                        res.end(
                            JSON.stringify({
                                success: true,
                                message: `Event '${eventData.event}' received and processed successfully`,
                                data: {
                                    event: eventData.event,
                                    value: eventData.value,
                                    scope: eventData.scope,
                                    detail: result.detail,
                                },
                            }),
                        );
                    } catch (error: any) {
                        logger.error(error, "Failed to process POST /api/action payload");
                        res.writeHead(400, { "Content-Type": "application/json" });
                        res.end(
                            JSON.stringify({
                                success: false,
                                error:
                                    error.message ||
                                    "Invalid JSON payload or schema validation error",
                            }),
                        );
                    }
                });
                return;
            }
        }

        // 404 Fallback
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: false, error: "Endpoint not found" }));
    });

    server.listen(port, () => {
        logger.info(`HTTP API Server listening on http://localhost:${port}`);
    });

    const stop = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            server.close((err) => {
                if (err) return reject(err);
                logger.info("HTTP API Server stopped.");
                resolve();
            });
        });
    };

    return { server, stop };
}
