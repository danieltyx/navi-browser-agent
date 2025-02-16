import mic = require('mic');
import * as fs from "fs";
import axios from "axios";
import * as dotenv from "dotenv";
/**
 * sophie: audio recording and transcription using groq api (not used)
 */
dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY || "your_groq_api_key_here";
const GROQ_API_URL = "https://api.groq.com/v1/audio/transcriptions";

/**
 * Records live audio and saves it as a WAV file.
 * @param duration - Duration of recording in seconds
 */
async function recordAudio(duration: number, outputFile: string): Promise<void> {
    return new Promise<void>((resolve) => {
        const microphone = mic({
            rate: "16000",
            channels: "1",
            fileType: "wav",
        });

        const micInputStream = microphone.getAudioStream();
        const fileStream = fs.createWriteStream(outputFile);
        micInputStream.pipe(fileStream);

        console.log(`Recording for ${duration} seconds...`);
        microphone.start();

        setTimeout(() => {
            microphone.stop();
            console.log("Recording complete.");
            resolve();
        }, duration * 1000);
    });
}

/**
 * Transcribes an audio file using Groq API.
 * @param filePath - Path to the audio file
 */
async function transcribeAudio(filePath: string): Promise<void> {
    try {
        const fileData = fs.readFileSync(filePath);

        const response = await axios.post(GROQ_API_URL, fileData, {
            headers: {
                Authorization: `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "audio/wav",
            },
        });

        console.log("📝 Transcription:", response.data.text || "No transcription available");
    } catch (error: any) {
        console.error("Error:", error.response ? error.response.data : error.message);
    }
}

// Run the recording and transcription
async function main() {
    const duration = 5; // Record for 5 seconds
    const outputFile = "recorded_audio.wav";

    await recordAudio(duration, outputFile);
    await transcribeAudio(outputFile);
}

main();