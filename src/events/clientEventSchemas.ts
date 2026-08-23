import { z } from "zod";

/**
 * Zod schema for incoming HTTP POST event payloads from the client application.
 * Value is coerced and validated as a string for key_press events.
 * Example payload: { "event": "key_press", "value": "Acción Numpad 1" }
 */
export const clientEventSchema = z.object({
    token: z.string().min(1, "Identification token is required"),
    event: z.string().min(1, "Event name is required"),
    value: z.coerce.string().min(1, "Value must be a string"),
    timestamp: z.string().optional(),
});

export type ClientEvent = z.infer<typeof clientEventSchema>;
