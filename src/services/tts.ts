import {
    type AudioPlayer,
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
import * as googleTTS from "google-tts-api";
import { logger } from "../utils/logger";

if (ffmpegPath) {
    process.env.FFMPEG_PATH = ffmpegPath;
}

export interface TTSOptions {
    lang?: string;
    slow?: boolean;
}

interface QueueItem {
    url: string;
    text: string;
}

interface GuildTTSState {
    player: AudioPlayer;
    connection: VoiceConnection;
    queue: QueueItem[];
    isPlaying: boolean;
    idleTimeout?: ReturnType<typeof setTimeout>;
}

export class TTSService {
    private static instance: TTSService;
    private states = new Map<string, GuildTTSState>();

    private constructor() {}

    public static getInstance(): TTSService {
        if (!TTSService.instance) {
            TTSService.instance = new TTSService();
        }
        return TTSService.instance;
    }

    /**
     * Joins or gets existing voice connection for a channel.
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
     * Converts message text to speech and queues audio playback.
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

        const lang = options.lang || "es";
        const slow = options.slow || false;

        // google-tts-api returns URLs split into chunks < 200 chars
        const audioResults = googleTTS.getAllAudioUrls(text, {
            lang,
            slow,
            host: "https://translate.google.com",
            splitPunct: ".,?:;!",
        });

        for (const item of audioResults) {
            state.queue.push({
                url: item.url,
                text: item.shortText || text,
            });
        }

        if (!state.isPlaying) {
            this.processQueue(guildId);
        }

        return audioResults.length;
    }

    /**
     * Stops playback and clears queue for a guild.
     */
    public stop(guildId: string): void {
        const state = this.states.get(guildId);
        if (!state) return;

        state.queue = [];
        state.isPlaying = false;
        state.player.stop(true);
    }

    /**
     * Leaves voice channel and cleans up state for a guild.
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
            // Move on to next in queue
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
