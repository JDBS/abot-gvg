import type { VoiceBasedChannel } from "discord.js";
import { z } from "zod";
import { ttsService } from "../services/tts";
import { logger } from "../utils/logger";
import { timeConversion } from "../utils/timeConversion";
import eventListJson from "./eventList.json";

export const TimeEventDetailsSchema = z.object({
    type: z.literal("time"),
    t: z.string(),
});

export const GvGEventSchema = z.object({
    tts: z.string(),
    event: TimeEventDetailsSchema,
});

export const EventListSchema = z.array(GvGEventSchema);

export type GvGEvent = z.infer<typeof GvGEventSchema>;

export interface ProcessedTimeEvent {
    tts: string;
    remainingSeconds: number;
    rawTime: string;
}

interface GuildTimerState {
    channel: VoiceBasedChannel;
    startTime: number;
    offsetSeconds: number;
    timeouts: ReturnType<typeof setTimeout>[];
    events: ProcessedTimeEvent[];
}

export class EventHandler {
    private activeTimers = new Map<string, GuildTimerState>();

    /**
     * Loads and validates event list using Zod, converts time strings to seconds,
     * and sorts events in descending order of remaining time (30m -> 0m).
     */
    public loadEvents(data: unknown = eventListJson): ProcessedTimeEvent[] {
        const validatedEvents = EventListSchema.parse(data);

        const processed: ProcessedTimeEvent[] = validatedEvents.map((item) => ({
            tts: item.tts,
            remainingSeconds: timeConversion.stringToSeconds(item.event.t),
            rawTime: item.event.t,
        }));

        // Sort descending by remainingSeconds (from 30m / 1800s down to 0m / 0s)
        processed.sort((a, b) => b.remainingSeconds - a.remainingSeconds);

        return processed;
    }

    /**
     * Starts the event sequence for a given voice channel.
     * @param channel The Discord voice channel to announce TTS messages in.
     * @param offsetSeconds Optional start offset in seconds (+ delays start, - starts ahead).
     */
    public async start(
        channel: VoiceBasedChannel,
        offsetSeconds: number = 0,
    ): Promise<ProcessedTimeEvent[]> {
        const guildId = channel.guild.id;

        // Stop any existing timer for this guild
        this.stop(guildId);

        const events = this.loadEvents();
        const firstEvent = events[0];
        if (!firstEvent) {
            logger.warn("No events found in eventList.json to schedule.");
            return [];
        }

        // maxSeconds is the starting point of GvG (e.g. 30m = 1800s)
        const maxSeconds = firstEvent.remainingSeconds;
        const timeouts: ReturnType<typeof setTimeout>[] = [];
        const startTime = Date.now();

        const guildState: GuildTimerState = {
            channel,
            startTime,
            offsetSeconds,
            timeouts,
            events,
        };

        this.activeTimers.set(guildId, guildState);

        logger.info(
            `Starting GvG EventHandler in guild "${channel.guild.name}" (Channel: "${channel.name}") with offset ${offsetSeconds}s`,
        );

        for (const event of events) {
            // Elapsed time required for this event relative to match start (30m -> 0s elapsed)
            const targetElapsedSeconds = maxSeconds - event.remainingSeconds;
            // Delay in seconds from now, accounting for start offset
            const delaySeconds = targetElapsedSeconds + offsetSeconds;

            if (delaySeconds < 0) {
                logger.info(
                    `Skipping event "${event.tts}" (${event.rawTime}) as delay is in the past (${delaySeconds}s)`,
                );
                continue;
            }

            const timeoutId = setTimeout(async () => {
                try {
                    logger.info(
                        `Triggering event "${event.tts}" (${event.rawTime}) in guild ${guildId}`,
                    );
                    await ttsService.speak(channel, event.tts);
                } catch (error) {
                    logger.error(
                        error,
                        `Error executing TTS for event "${event.tts}" in guild ${guildId}`,
                    );
                }
            }, delaySeconds * 1000);

            timeouts.push(timeoutId);
        }

        return events;
    }

    /**
     * Stops and cancels all active timeouts for a guild.
     */
    public stop(guildId: string): void {
        const state = this.activeTimers.get(guildId);
        if (!state) return;

        for (const timeoutId of state.timeouts) {
            clearTimeout(timeoutId);
        }

        this.activeTimers.delete(guildId);
        logger.info(`Stopped GvG EventHandler for guild ${guildId}`);
    }

    /**
     * Checks if a timer is currently active for a guild.
     */
    public isRunning(guildId: string): boolean {
        return this.activeTimers.has(guildId);
    }
}

export const eventHandler = new EventHandler();
