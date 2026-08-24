import type { VoiceBasedChannel } from "discord.js";
import { ttsService } from "../services/tts";
import { logger } from "../utils/logger";
import eventListJson from "./eventList.json";
import type { ProcessedTimeEvent } from "./eventSchemas";
import { parseAndSortEvents, prepareScheduledEvents } from "./eventUtils";

export * from "./eventSchemas";
export * from "./eventUtils";

export type ChannelMap = {
    ataque?: VoiceBasedChannel;
    defensa?: VoiceBasedChannel;
};

/**
 * State of active timer per guild.
 */
interface GuildTimerState {
    channels: ChannelMap;
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
    private guildOffsets = new Map<string, number>();

    /**
     * Sets configured offset for a guild.
     */
    public setGuildOffset(guildId: string, offsetSeconds: number): void {
        this.guildOffsets.set(guildId, offsetSeconds);
    }

    /**
     * Gets configured offset for a guild (defaults to 0).
     */
    public getGuildOffset(guildId: string): number {
        return this.guildOffsets.get(guildId) ?? 0;
    }

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
     * Starts the GvG event sequence for a given voice channel or channel map.
     * Connects bots to voice channels if not already connected.
     * Cancels any previously running timer for the same guild.
     *
     * @param channelOrMap - The Discord voice channel or ChannelMap to announce TTS messages in.
     * @param offsetSeconds - Optional start offset in seconds (+ delays start, - starts ahead).
     * @returns List of processed GvG events scheduled for execution.
     */
    public async start(
        channelOrMap: VoiceBasedChannel | ChannelMap,
        offsetSeconds?: number,
    ): Promise<ProcessedTimeEvent[]> {
        const channels: ChannelMap =
            "guild" in channelOrMap
                ? { ataque: channelOrMap, defensa: channelOrMap }
                : channelOrMap;

        const primaryChannel = channels.ataque || channels.defensa;
        if (!primaryChannel) {
            logger.warn("No voice channel provided to EventHandler.start()");
            return [];
        }

        const guildId = primaryChannel.guild.id;
        const effectiveOffset = offsetSeconds ?? this.getGuildOffset(guildId);
        this.setGuildOffset(guildId, effectiveOffset);

        // Stop any existing timer for this guild
        this.stop(guildId);

        // Connect bots to voice channels immediately
        if (channels.ataque) {
            try {
                await ttsService.joinChannel(channels.ataque);
            } catch (error) {
                logger.error(
                    error,
                    `Failed to connect Ataque bot to channel ${channels.ataque.name}`,
                );
            }
        }
        if (channels.defensa && channels.defensa !== channels.ataque) {
            try {
                await ttsService.joinChannel(channels.defensa);
            } catch (error) {
                logger.error(
                    error,
                    `Failed to connect Defensa bot to channel ${channels.defensa.name}`,
                );
            }
        }

        const events = this.loadEvents();
        if (events.length === 0) {
            logger.warn("No events found in eventList.json to schedule.");
            return [];
        }

        const scheduledEvents = prepareScheduledEvents(events, effectiveOffset);
        const timeouts: ReturnType<typeof setTimeout>[] = [];
        const startTime = Date.now();

        const guildState: GuildTimerState = {
            channels,
            startTime,
            offsetSeconds: effectiveOffset,
            timeouts,
            events,
        };

        this.activeTimers.set(guildId, guildState);

        logger.info(
            `Starting GvG EventHandler in guild "${primaryChannel.guild.name}" with offset ${effectiveOffset}s`,
        );

        for (const { event, delaySeconds } of scheduledEvents) {
            const timeoutId = setTimeout(async () => {
                try {
                    logger.info(
                        `Triggering event "${event.tts}" (${event.rawTime}, Scope: ${event.scope}) in guild ${guildId}`,
                    );

                    const targetChannels: VoiceBasedChannel[] = [];
                    if (event.scope === "global") {
                        if (channels.ataque) targetChannels.push(channels.ataque);
                        if (channels.defensa && channels.defensa !== channels.ataque) {
                            targetChannels.push(channels.defensa);
                        }
                    } else if (event.scope === "ataque" && channels.ataque) {
                        targetChannels.push(channels.ataque);
                    } else if (event.scope === "defensa" && channels.defensa) {
                        targetChannels.push(channels.defensa);
                    }

                    await Promise.all(targetChannels.map((ch) => ttsService.speak(ch, event.tts)));
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

    /**
     * Gets active channels for a guild if a timer is running.
     */
    public getActiveChannels(guildId: string): ChannelMap | undefined {
        return this.activeTimers.get(guildId)?.channels;
    }
}

export const eventHandler = new EventHandler();
