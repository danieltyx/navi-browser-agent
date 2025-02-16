import { NextResponse } from 'next/server';
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert audio file to proper format
    const audioData = await file.arrayBuffer();
    const blob = new Blob([audioData], { type: 'audio/webm' });

    // Create form data for the API request
    const apiFormData = new FormData();
    apiFormData.append('file', blob, 'audio.webm');
    apiFormData.append('model', 'whisper-large-v3');

    // Use Groq's Whisper model for transcription
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: apiFormData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to transcribe audio');
    }

    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    );
  }
} 