import { z } from "zod";

/**
 * Zod schema for bot scope ("global", "ataque", or "defensa").
 */
export const BotScopeSchema = z.enum(["global", "ataque", "defensa"]).default("global");
export type BotScope = z.infer<typeof BotScopeSchema>;

/**
 * Zod schema for details of a time-based event.
 */
export const TimeEventDetailsSchema = z.object({
    type: z.literal("time"),
    scope: BotScopeSchema.default("global"),
    t: z.string(),
});

/**
 * Zod schema for a single GvG event item.
 */
export const GvGEventSchema = z.object({
    tts: z.string(),
    event: TimeEventDetailsSchema,
});

/**
 * Zod schema for a list of GvG events.
 */
export const EventListSchema = z.array(GvGEventSchema);

/**
 * TypeScript type for raw input GvG event.
 */
export type GvGEvent = z.infer<typeof GvGEventSchema>;

/**
 * Represents an event processed with remaining seconds and calculated properties.
 */
export interface ProcessedTimeEvent {
    /** The Text-To-Speech announcement string */
    tts: string;
    /** The target bot scope ("global", "ataque", or "defensa") */
    scope: BotScope;
    /** Remaining seconds in the countdown when this event triggers */
    remainingSeconds: number;
    /** The raw time string from event configuration (e.g. "30m", "26m") */
    rawTime: string;
}

/**
 * Represents an event scheduled with calculated execution delay.
 */
export interface ScheduledTimeEvent {
    event: ProcessedTimeEvent;
    delaySeconds: number;
}
