/**
 * Utility module for time string parsing and formatting.
 */

/**
 * Converts a time formatted string (e.g. "2h 23m 1s", "30m", "10s") into total seconds.
 *
 * @param value - The time string to convert.
 * @returns Total seconds represented by the time string.
 * @throws {Error} If the string is empty or does not match valid time units.
 *
 * @example
 * ```ts
 * stringToSeconds("1h 30m"); // Returns 5400
 * stringToSeconds("30m");    // Returns 1800
 * ```
 */
export const stringToSeconds = (value: string): number => {
    if (!value || typeof value !== "string") {
        throw new Error("Invalid time format: value must be a non-empty string.");
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
        throw new Error("Invalid time format: time string cannot be empty.");
    }

    // Must match at least one time component (e.g., 2h, 30m, 15s)
    const regex = /^(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?$/i;
    const match = trimmed.match(regex);

    if (!match || (!match[1] && !match[2] && !match[3])) {
        throw new Error(`Invalid time format: "${value}"`);
    }

    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const seconds = match[3] ? parseInt(match[3], 10) : 0;

    return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Converts a total number of seconds into a human-readable time string (e.g. "2h 23m 1s" or "30m").
 *
 * @param totalSeconds - Non-negative number of seconds to format.
 * @returns Human readable time string.
 * @throws {Error} If totalSeconds is negative or not a finite number.
 *
 * @example
 * ```ts
 * secondsToString(5400); // Returns "1h 30m"
 * secondsToString(45);   // Returns "45s"
 * ```
 */
export const secondsToString = (totalSeconds: number): string => {
    if (typeof totalSeconds !== "number" || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
        throw new Error("Invalid seconds: value must be a non-negative finite number.");
    }

    if (totalSeconds === 0) {
        return "0s";
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(" ");
};

export const timeConversion = {
    stringToSeconds,
    secondsToString,
};
