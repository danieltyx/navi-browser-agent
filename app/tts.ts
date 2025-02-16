'use client';  // Add this to mark as client component

import { ElevenLabsClient } from 'elevenlabs';

const ELEVENLABS_API_KEY = "sk_bd7534aaeb1c2ea7813388571800026d9d8c8cd3090683f2";
const client = new ElevenLabsClient({
  apiKey: ELEVENLABS_API_KEY,
});

export async function speakText(text: string) {
  console.log("Starting TTS for:", text);

  const utterance = new SpeechSynthesisUtterance(text);
  console.log('Created utterance for:', text);

  return new Promise((resolve, reject) => {
    utterance.onstart = () => console.log('Speech started');
    utterance.onend = () => {
      console.log('Speech ended');
      resolve(null);
    };
    utterance.onerror = (error) => {
      console.error('Speech error:', error);
      reject(error);
    };

    window.speechSynthesis.speak(utterance);
    console.log('Requested speech synthesis');
  });
}
speakText("Hello, how are you?").then();