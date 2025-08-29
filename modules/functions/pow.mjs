import { crypto } from "../../index.mjs";

export async function estimatePoWDuration(difficulty, sampleSeconds = 3) {
    const hashRate = 18535;
    const expectedTries = Math.pow(2, 4 * difficulty);


    const estimatedSeconds = (expectedTries / hashRate) * 2;

    return {
        hashRate,
        expectedTries,
        estimatedSeconds: Math.round(estimatedSeconds / 2)
    };
}

export function formatTimeDifference(startTimestamp, endTimestamp) {
    let diffMs = endTimestamp - startTimestamp;
    if (diffMs < 0) diffMs = 0; // prevent negative

    const totalSeconds = Math.floor(diffMs / 1000);

    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);

    return parts.join(', ');
}

/*
const result = await estimatePoWDuration(6);
console.log(`Hashrate: ${result.hashRate} H/s`);
console.log(`Estimated time: ${result.estimatedSeconds} seconds`);
*/