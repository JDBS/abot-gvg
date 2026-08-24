/**
 * Logger module configuring Pino structured logging with pretty formatting.
 */

import pino from "pino";

/**
 * Global application logger instance.
 */
export const logger = pino({
    level: "info",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "yyyy-mm-dd HH:MM:ss",
            ignore: "pid,hostname",
        },
    },
});
