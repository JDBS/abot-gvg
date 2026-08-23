import {
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    type VoiceConnection,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import type { VoiceBasedChannel } from "discord.js";
import ffmpegPath from "ffmpeg-static";
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
     */
    public static getInstance(): TTSService {
        if (!TTSService.instance) {
            TTSService.instance = new TTSService();
        }
        return TTSService.instance;
    }

    /**
     * Joins or gets an existing voice connection for a given voice channel.
     *
     * @param channel - The Discord voice channel to join.
     * @returns Promise resolving to active VoiceConnection.
     * @throws {Error} If connection fails to establish within timeout.
     */
    public async joinChannel(channel: VoiceBasedChannel): Promise<VoiceConnection> {
        const guildId = channel.guild.id;
        let state = this.states.get(guildId);

        if (state?.connection) {
            if (state.connection.joinConfig.channelId === channel.id) {
                return state.connection;
            }
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guildId,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
        } catch (error) {
            logger.error(error, `Failed to join voice channel ${channel.id} in guild ${guildId}`);
            connection.destroy();
            this.states.delete(guildId);
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
            this.setupPlayerListeners(guildId, state);
            this.setupConnectionListeners(guildId, connection);
            this.states.set(guildId, state);
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
     * @returns Number of audio chunks queued for playback.
     */
    public async speak(
        channel: VoiceBasedChannel,
        text: string,
        options: TTSOptions = {},
    ): Promise<number> {
        const guildId = channel.guild.id;
        await this.joinChannel(channel);

        const state = this.states.get(guildId);
        if (!state) {
            throw new Error("Voice state not initialized.");
        }

        const items = generateTTSQueueItems(text, options);
        state.queue.push(...items);

        if (!state.isPlaying) {
            this.processQueue(guildId);
        }

        return items.length;
    }

    /**
     * Stops current audio playback and clears the queue for a guild.
     *
     * @param guildId - The Discord guild ID.
     */
    public stop(guildId: string): void {
        const state = this.states.get(guildId);
        if (!state) return;

        state.queue = [];
        state.isPlaying = false;
        state.player.stop(true);
    }

    /**
     * Leaves the voice channel and cleans up all state for a guild.
     *
     * @param guildId - The Discord guild ID.
     */
    public leave(guildId: string): void {
        this.stop(guildId);

        const state = this.states.get(guildId);
        if (state) {
            if (state.idleTimeout) clearTimeout(state.idleTimeout);
            state.connection.destroy();
            this.states.delete(guildId);
        } else {
            const existingConn = getVoiceConnection(guildId);
            if (existingConn) {
                existingConn.destroy();
            }
        }
    }

    /**
     * Processes next item in queue for a guild.
     */
    private processQueue(guildId: string): void {
        const state = this.states.get(guildId);
        if (!state) return;

        if (state.queue.length === 0) {
            state.isPlaying = false;
            this.resetIdleTimeout(guildId);
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
            const resource = createAudioResource(item.url);
            state.player.play(resource);
        } catch (error) {
            logger.error(error, `Error creating audio resource for URL: ${item.url}`);
            this.processQueue(guildId);
        }
    }

    private setupPlayerListeners(guildId: string, state: GuildTTSState): void {
        state.player.on(AudioPlayerStatus.Idle, () => {
            this.processQueue(guildId);
        });

        state.player.on("error", (error) => {
            logger.error(error, `Audio player error in guild ${guildId}`);
            this.processQueue(guildId);
        });
    }

    private setupConnectionListeners(guildId: string, connection: VoiceConnection): void {
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch {
                logger.info(`Voice connection disconnected in guild ${guildId}`);
                this.leave(guildId);
            }
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            this.states.delete(guildId);
        });
    }

    private resetIdleTimeout(guildId: string): void {
        const state = this.states.get(guildId);
        if (!state) return;

        if (state.idleTimeout) clearTimeout(state.idleTimeout);

        // Auto disconnect after 5 minutes of inactivity
        state.idleTimeout = setTimeout(
            () => {
                logger.info(
                    `Auto disconnecting TTS voice channel in guild ${guildId} due to inactivity`,
                );
                this.leave(guildId);
            },
            5 * 60 * 1000,
        );
    }
}

export const ttsService = TTSService.getInstance();
