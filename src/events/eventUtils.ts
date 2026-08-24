import { stringToSeconds } from "../utils/timeConversion";
import { EventListSchema, type ProcessedTimeEvent, type ScheduledTimeEvent } from "./eventSchemas";

/**
 * Parses and validates raw event data using Zod, converts raw time strings to seconds,
 * and returns events sorted in descending order of remaining time (e.g. 30m -> 0m).
 *
 * @param data - The raw JSON data or array to parse.
 * @returns Array of ProcessedTimeEvent sorted descending by remainingSeconds.
 * @throws {ZodError} If validation fails.
 *
 * @example
 * ```ts
 * const events = parseAndSortEvents(jsonData);
 * console.log(events[0].remainingSeconds); // 1800
 * ```
 */
export const parseAndSortEvents = (data: unknown): ProcessedTimeEvent[] => {
    const validatedEvents = EventListSchema.parse(data);

    const processed: ProcessedTimeEvent[] = validatedEvents.map((item) => ({
        tts: item.tts,
        scope: item.event.scope ?? "global",
        remainingSeconds: stringToSeconds(item.event.t),
        rawTime: item.event.t,
    }));

    // Sort descending by remainingSeconds (from starting time down to 0s)
    processed.sort((a, b) => b.remainingSeconds - a.remainingSeconds);

    return processed;
};

/**
 * Calculates the execution delay in seconds for an event given match total duration and start offset.
 *
 * @param eventRemainingSeconds - Remaining seconds of the match when event should fire (e.g., 1800s for 30m).
 * @param maxSeconds - Total match duration in seconds (starting point, e.g. 1800s).
 * @param offsetSeconds - Start offset (+ delays start, - starts ahead).
 * @returns Delay in seconds from initial start time.
 */
export const calculateEventDelay = (
    eventRemainingSeconds: number,
    maxSeconds: number,
    offsetSeconds: number = 0,
): number => {
    const targetElapsedSeconds = maxSeconds - eventRemainingSeconds;
    return targetElapsedSeconds + offsetSeconds;
};

/**
 * Filters and prepares scheduled events by calculating delays and ignoring events scheduled in the past.
 *
 * @param events - List of processed events.
 * @param offsetSeconds - Start offset in seconds.
 * @returns List of ScheduledTimeEvent objects with delaySeconds >= 0.
 */
export const prepareScheduledEvents = (
    events: ProcessedTimeEvent[],
    offsetSeconds: number = 0,
): ScheduledTimeEvent[] => {
    const firstEvent = events[0];
    if (!firstEvent) {
        return [];
    }

    const maxSeconds = firstEvent.remainingSeconds;
    const scheduled: ScheduledTimeEvent[] = [];

    for (const event of events) {
        const delaySeconds = calculateEventDelay(event.remainingSeconds, maxSeconds, offsetSeconds);

        if (delaySeconds >= 0) {
            scheduled.push({ event, delaySeconds });
        }
    }

    return scheduled;
};
