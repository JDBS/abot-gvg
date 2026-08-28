import { spawn } from "node:child_process";
import {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    StreamType,
    type VoiceConnection,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import type { VoiceBasedChannel } from "discord.js";
import ffmpegPath from "ffmpeg-static";
import { env } from "../config";
import { logger } from "../utils/logger";
import { type GuildTTSState, generateTTSQueueItems, type TTSOptions } from "./ttsUtils";

export * from "./ttsUtils";

if (ffmpegPath) {
    process.env.FFMPEG_PATH = ffmpegPath;
}

/**
 * Singleton service for managing Text-To-Speech playback in Discord voice channels.
 */
export class TTSService {
    private static instance: TTSService;
    private states = new Map<string, GuildTTSState>();

    private constructor() { }

    /**
     * Gets the singleton instance of TTSService.
     *
     * @returns Singleton instance of TTSService.
     */
    public static getInstance(): TTSService {
        if (!TTSService.instance) {
            TTSService.instance = new TTSService();
        }
        return TTSService.instance;
    }

    /**
     * Generates a state map lookup key for a channel.
     */
    private getKey(channel: VoiceBasedChannel): string {
        const clientId = channel.client?.user?.id || "default";
        return `${channel.guild.id}:${clientId}`;
    }

    /**
     * Joins or gets an existing voice connection for a given voice channel.
     *
     * @param channel - The Discord voice channel to join.
     * @returns Promise resolving to active VoiceConnection.
     * @throws {Error} If connection fails to establish within timeout.
     */
    public async joinChannel(channel: VoiceBasedChannel): Promise<VoiceConnection> {
        const key = this.getKey(channel);
        const guildId = channel.guild.id;
        let state = this.states.get(key);

        if (state?.connection) {
            if (state.connection.joinConfig.channelId === channel.id) {
                return state.connection;
            }
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guildId,
            group: channel.client?.user?.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
        } catch (error) {
            logger.error(error, `Failed to join voice channel "${channel.name}"`);
            connection.destroy();
            this.states.delete(key);
            throw new Error("Failed to connect to voice channel within timeout.");
        }

        if (!state) {
            const player = createAudioPlayer();
            state = {
                player,
                connection,
                queue: [],
                isPlaying: false,
            };

            connection.subscribe(player);
            this.setupPlayerListeners(key, state);
            this.setupConnectionListeners(key, connection);
            this.states.set(key, state);
        } else {
            state.connection = connection;
            connection.subscribe(state.player);
        }

        return connection;
    }

    /**
     * Converts message text to speech and queues audio playback in the specified voice channel.
     *
     * @param channel - The Discord voice channel to speak in.
     * @param text - Text message to convert to speech.
     * @param options - Optional language and speech speed configuration.
     * @returns Promise resolving to number of audio chunks queued for playback.
     */
    public async speak(
        channel: VoiceBasedChannel,
        text: string,
        options: TTSOptions = {},
    ): Promise<number> {
        const key = this.getKey(channel);
        await this.joinChannel(channel);

        const state = this.states.get(key);
        if (!state) {
            throw new Error("Voice state not initialized.");
        }

        const speed = options.speed ?? env.TTS_SPEED;
        const items = generateTTSQueueItems(text, { ...options, speed });
        state.queue.push(...items);

        if (!state.isPlaying) {
            this.processQueue(key);
        }

        return items.length;
    }

    /**
     * Stops current audio playback and clears the queue for a guild or specific key.
     *
     * @param guildIdOrKey - The Discord guild ID or unique state key.
     */
    public stop(guildIdOrKey: string): void {
        const matchingKeys = Array.from(this.states.keys()).filter(
            (k) => k === guildIdOrKey || k.startsWith(`${guildIdOrKey}:`),
        );

        for (const key of matchingKeys) {
            const state = this.states.get(key);
            if (!state) continue;

            state.queue = [];
            state.isPlaying = false;
            state.player.stop(true);
        }
    }

    /**
     * Leaves the voice channel and cleans up all state for a guild or specific key.
     *
     * @param guildIdOrKey - The Discord guild ID or unique state key.
     */
    public leave(guildIdOrKey: string): void {
        this.stop(guildIdOrKey);

        const matchingKeys = Array.from(this.states.keys()).filter(
            (k) => k === guildIdOrKey || k.startsWith(`${guildIdOrKey}:`),
        );

        for (const key of matchingKeys) {
            const state = this.states.get(key);
            if (state) {
                if (state.idleTimeout) clearTimeout(state.idleTimeout);
                state.connection.destroy();
                this.states.delete(key);
            }
        }

        if (matchingKeys.length === 0) {
            const existingConn = getVoiceConnection(guildIdOrKey);
            if (existingConn) {
                existingConn.destroy();
            }
        }
    }

    /**
     * Processes next item in queue for a key.
     */
    private processQueue(key: string): void {
        const state = this.states.get(key);
        if (!state) return;

        if (state.queue.length === 0) {
            state.isPlaying = false;
            this.resetIdleTimeout(key);
            return;
        }

        if (state.idleTimeout) {
            clearTimeout(state.idleTimeout);
            state.idleTimeout = undefined;
        }

        state.isPlaying = true;
        const item = state.queue.shift();
        if (!item) return;

        try {
            const speed = item.speed ?? 1.0;
            const ffmpegArgs = [
                "-reconnect",
                "1",
                "-reconnect_streamed",
                "1",
                "-reconnect_delay_max",
                "5",
                "-i",
                item.url,
            ];

            if (speed !== 1.0) {
                ffmpegArgs.push("-af", `atempo=${speed}`);
            }

            ffmpegArgs.push("-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1");

            const ffmpegProcess = spawn(ffmpegPath || "ffmpeg", ffmpegArgs);

            ffmpegProcess.on("error", (err) => {
                logger.error(err, "FFmpeg process error for TTS audio stream");
            });

            const cleanup = () => {
                if (!ffmpegProcess.killed) {
                    ffmpegProcess.kill("SIGKILL");
                }
            };

            let bufferingTimeout: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
                if (state.player.state.status === AudioPlayerStatus.Buffering) {
                    logger.warn(
                        "TTS buffering timeout reached (remote stream stalled). Skipping item.",
                    );
                    cleanup();
                    state.player.stop(true);
                }
            }, 10_000);

            const onPlaying = () => {
                if (bufferingTimeout) {
                    clearTimeout(bufferingTimeout);
                    bufferingTimeout = undefined;
                }
            };

            state.player.once(AudioPlayerStatus.Playing, onPlaying);
            state.player.once(AudioPlayerStatus.Idle, cleanup);
            state.player.once("error", cleanup);

            console.log(`[TTS] Processing queue for key ${key} - ${state.queue.length} items remaining`);
            console.log(`[TTS] creating audio resource`);
            const resource = createAudioResource(ffmpegProcess.stdout, {
                inputType: StreamType.Raw,
            });
            console.log(`[TTS] audio resource created`);
            console.log(`[TTS] playing audio`);
            state.player.play(resource);
            console.log(`audio playing`);
        } catch (error) {
            logger.error(error, "Error creating audio resource for TTS playback");
            this.processQueue(key);
        }
    }

    private setupPlayerListeners(key: string, state: GuildTTSState): void {
        state.player.on(AudioPlayerStatus.Idle, () => {
            this.processQueue(key);
        });

        state.player.on("error", (error) => {
            logger.error(error, "Audio player error during TTS playback");
            this.processQueue(key);
        });
    }

    private setupConnectionListeners(key: string, connection: VoiceConnection): void {
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch {
                logger.info("Voice connection disconnected");
                this.leave(key);
            }
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            this.states.delete(key);
        });
    }

    private resetIdleTimeout(key: string): void {
        const state = this.states.get(key);
        if (!state) return;

        if (state.idleTimeout) clearTimeout(state.idleTimeout);

        // Auto disconnect after 5 minutes of inactivity
        state.idleTimeout = setTimeout(
            () => {
                logger.info("Auto disconnecting TTS voice channel due to inactivity");
                this.leave(key);
            },
            5 * 60 * 1000,
        );
    }
}

export const ttsService = TTSService.getInstance();
