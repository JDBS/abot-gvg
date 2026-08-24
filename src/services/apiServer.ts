import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer, type Server } from "node:http";
import type { Client } from "discord.js";
import { env } from "../config";
import { clientEventSchema } from "../events/clientEventSchemas";
import { logger } from "../utils/logger";
import { type BotClients, handleClientEvent } from "./clientEventHandler";

export type { BotClients };

/**
 * Instance structure returned by startApiServer.
 */
export interface ApiServerInstance {
    /** Underlying Node.js HTTP Server */
    server: Server;
    /** Gracefully stops the HTTP API server */
    stop: () => Promise<void>;
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
                            logger.warn("Unauthorized event token received");
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
