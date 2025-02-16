'use client';  // Add this to mark as client component

// import { ElevenLabsClient } from 'elevenlabs';


// const client = new ElevenLabsClient({
//   apiKey: ELEVENLABS_API_KEY,
// });

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