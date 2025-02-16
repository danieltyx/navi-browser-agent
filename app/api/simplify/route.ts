import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    // Fetch the webpage content
    const response = await axios.get(url);
    const html = response.data;
    
    // Parse HTML and extract text content
    const $ = cheerio.load(html);
    
    // Remove unnecessary elements
    $('script, style, iframe, img').remove();
    
    // Get main content
    const text = $('body').text().trim();
    const links = $('a').map((_, el) => $(el).attr('href')).get();
    
    // Use Mistral to simplify the content
    const mistralResponse = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-medium',
        messages: [{
          role: 'user',
          content: `Create a clean, well-formatted HTML summary of this content. Follow these rules:
1. Use semantic HTML5 elements
2. Include a clear title at the top
3. Break content into logical sections with h2 headings
4. Use bullet points for key points
5. Style important text with <strong> tags
6. Include a "Key Takeaways" section
7. Add a "Related Links" section at the end
8. Keep paragraphs short and readable
9. Ensure all links are preserved and properly formatted

Content to summarize: ${text}

Response format:
<article class="content">
  <h1 class="text-white text-3xl font-bold mb-6">Title</h1>
  <section class="mb-8">
    <h2 class="text-white text-xl font-semibold mb-4">Overview</h2>
    <p class="text-white/90 mb-4">...</p>
  </section>
  <!-- More sections -->
  <section class="mb-8">
    <h2 class="text-white text-xl font-semibold mb-4">Key Takeaways</h2>
    <ul class="list-disc pl-4 space-y-2">
      <li class="text-white/90">...</li>
    </ul>
  </section>
  <section class="mt-8 pt-8 border-t border-white/10">
    <h2 class="text-white text-xl font-semibold mb-4">Related Links</h2>
    <ul class="list-disc pl-4 space-y-2">
      ${links.map(link => `<li><a href="${link}" class="text-blue-400 hover:text-blue-300 underline">${link}</a></li>`).join('\n')}
    </ul>
  </section>
</article>`
        }],
      }),
    });

    const simplifiedContent = await mistralResponse.json();
    
    return NextResponse.json({ 
      success: true, 
      content: simplifiedContent.choices[0].message.content 
    });
  } catch (error) {
    console.error('Simplification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to simplify content' },
      { status: 500 }
    );
  }
} 