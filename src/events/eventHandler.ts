import type { VoiceBasedChannel } from "discord.js";
import { ttsService } from "../services/tts";
import { logger } from "../utils/logger";
import eventListJson from "./eventList.json";
import type { ProcessedTimeEvent } from "./eventSchemas";
import { parseAndSortEvents, prepareScheduledEvents } from "./eventUtils";

export * from "./eventSchemas";
export * from "./eventUtils";

/**
 * State of active timer per guild.
 */
interface GuildTimerState {
    channel: VoiceBasedChannel;
    startTime: number;
    offsetSeconds: number;
    timeouts: ReturnType<typeof setTimeout>[];
    events: ProcessedTimeEvent[];
}

/**
 * Service managing time-based GvG event execution per Discord guild.
 */
export class EventHandler {
    private activeTimers = new Map<string, GuildTimerState>();

    /**
     * Loads and validates event list using Zod, converts time strings to seconds,
     * and sorts events in descending order of remaining time (30m -> 0m).
     *
     * @param data - Optional event data input (defaults to eventList.json).
     * @returns List of processed and sorted GvG time events.
     */
    public loadEvents(data: unknown = eventListJson): ProcessedTimeEvent[] {
        return parseAndSortEvents(data);
    }

    /**
     * Starts the GvG event sequence for a given voice channel.
     * Cancels any previously running timer for the same guild.
     *
     * @param channel - The Discord voice channel to announce TTS messages in.
     * @param offsetSeconds - Optional start offset in seconds (+ delays start, - starts ahead).
     * @returns List of processed GvG events scheduled for execution.
     */
    public async start(
        channel: VoiceBasedChannel,
        offsetSeconds: number = 0,
    ): Promise<ProcessedTimeEvent[]> {
        const guildId = channel.guild.id;

        // Stop any existing timer for this guild
        this.stop(guildId);

        const events = this.loadEvents();
        if (events.length === 0) {
            logger.warn("No events found in eventList.json to schedule.");
            return [];
        }

        const scheduledEvents = prepareScheduledEvents(events, offsetSeconds);
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

        for (const { event, delaySeconds } of scheduledEvents) {
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
     *
     * @param guildId - The Discord guild ID.
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
     *
     * @param guildId - The Discord guild ID.
     * @returns True if a timer is running for the specified guild.
     */
    public isRunning(guildId: string): boolean {
        return this.activeTimers.has(guildId);
    }
}

export const eventHandler = new EventHandler();
