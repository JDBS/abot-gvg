import type { AudioPlayer, VoiceConnection } from "@discordjs/voice";
import * as googleTTS from "google-tts-api";

/**
 * Options for Text-To-Speech generation.
 */
export interface TTSOptions {
    /** ISO 639-1 language code (default: "es") */
    lang?: string;
    /** Whether to play speech at a slower rate */
    slow?: boolean;
}

/**
 * Item in the playback queue for a guild.
 */
export interface QueueItem {
    /** Direct audio stream URL from Google TTS */
    url: string;
    /** The text snippet corresponding to this audio URL */
    text: string;
}

/**
 * Internal state maintained per Discord guild for TTS playback.
 */
export interface GuildTTSState {
    player: AudioPlayer;
    connection: VoiceConnection;
    queue: QueueItem[];
    isPlaying: boolean;
    idleTimeout?: ReturnType<typeof setTimeout>;
}

/**
 * Generates an array of queue items containing Google TTS audio URLs for a given text.
 * Google TTS splits text into chunks under 200 characters.
 *
 * @param text - The text string to speak out loud.
 * @param options - Language and speed options.
 * @returns Array of QueueItem containing audio stream URLs and short text snippets.
 * @throws {Error} If text is empty or invalid.
 *
 * @example
 * ```ts
 * const items = generateTTSQueueItems("Hola mundo", { lang: "es" });
 * console.log(items[0].url);
 * ```
 */
export const generateTTSQueueItems = (text: string, options: TTSOptions = {}): QueueItem[] => {
    if (!text || typeof text !== "string" || text.trim().length === 0) {
        throw new Error("Text parameter must be a non-empty string.");
    }

    const lang = options.lang || "es";
    const slow = options.slow || false;

    const audioResults = googleTTS.getAllAudioUrls(text, {
        lang,
        slow,
        host: "https://translate.google.com",
        splitPunct: ".,?:;!",
    });

    return audioResults.map((item) => ({
        url: item.url,
        text: item.shortText || text,
    }));
};
