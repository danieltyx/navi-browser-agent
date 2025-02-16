import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    const response = await axios.post('https://playground.context.inc/api/context', {
      text: text,
      query: 'generate some user intention (like what they are trying to do)',
    }, {
      headers: {
        'x-api-key': process.env.NEXT_PUBLIC_CONTEXT_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    // Ensure we're returning a string response
    const intentText = typeof response.data.response === 'string' 
      ? response.data.response 
      : JSON.stringify(response.data.response);

    return NextResponse.json({ 
      success: true, 
      data: { response: intentText }
    });
  } catch (error) {
    console.error('Context API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze context' },
      { status: 500 }
    );
  }
} 