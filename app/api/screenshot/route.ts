import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import OpenAI from 'openai';
import { storage } from '@/app/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Add OPTIONS handler
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await req.text();
    let { screenshot, title } = JSON.parse(body);
    
    if (!screenshot) {
      return NextResponse.json({
        success: false,
        error: 'Screenshot is required'
      }, { status: 400, headers });
    }

    // Convert base64 to buffer
    const base64Data = screenshot.replace(/^data:image\/jpeg;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    console.log('Uploading to Firebase...');
    const timestamp = new Date().getTime();
    const storageRef = ref(storage, `screenshots/${timestamp}.jpg`);
    
    await uploadBytes(storageRef, imageBuffer);
    const downloadURL = await getDownloadURL(storageRef);

    console.log('Analyzing with OpenAI...');
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this webpage screenshot. Page title: ${title}. Provide a detailed context of the webpage content.`
            },
            {
              type: "image_url",
              image_url: {
                url: downloadURL,
                detail: "high"
              }
            }
          ],
        },
      ],
      max_tokens: 500,
    });

    const analysis = response.choices[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      analysis,
      screenshotUrl: downloadURL,
      pageTitle: title
    }, { headers });

  } catch (error) {
    console.error('Screenshot error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process screenshot'
    }, { status: 500, headers });
  }
} 