// create an arrow function in typescript to convert "2h 23m 1s" to number seconds

const stringToSeconds = (value: string): number => {
    const regex = /(\d+h)?\s*(\d+m)?\s*(\d+s)?/;
    const match = value.match(regex);

    if (!match) {
        throw new Error(`Invalid time format: "${value}"`);
    }

    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    const seconds = match[3] ? parseInt(match[3], 10) : 0;

    return hours * 3600 + minutes * 60 + seconds;
};

export const timeConversion = {
    stringToSeconds,
};
