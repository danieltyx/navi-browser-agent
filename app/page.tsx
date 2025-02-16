'use client';
import { useState, useRef, useEffect, use } from "react";
import Image from "next/image";
import html2canvas from 'html2canvas';
import VoiceRecorder from './components/VoiceRecorder';
import RecordButton from './components/RecordButton';
import Link from 'next/link';

import { ElevenLabsClient } from 'elevenlabs';
import axios from 'axios';


interface Screenshot {
  url: string;
  timestamp: number;
  analysis: string;
}

interface SuggestedQuestion {
  id: string;
  text: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [currentContext, setCurrentContext] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const screenshotContainerRef = useRef<HTMLDivElement>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<SuggestedQuestion[]>([]);
  const [userIntent, setUserIntent] = useState<string>('');

 

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError(null);

    try {
      // Add protocol if missing
      const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;

      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlWithProtocol }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid content type:', contentType);
        throw new Error('Server did not return JSON');
      }

      

      const data = await response.json();
      
      if (data.success) {
        setCurrentContext(data.analysis);
      } else {
        setError(data.error || 'Failed to capture screenshot');
      }
    } catch (error) {
      setError(`Error processing URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initScreenShare = async () => {
    if (streamRef.current) return streamRef.current;
    
    try {
      const stream = await window.navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "window" }
      });
      
      // Store stream in ref
      streamRef.current = stream;
      
      // Handle when user stops sharing
      stream.getVideoTracks()[0].onended = () => {
        streamRef.current = null;
      };
      
      return stream;
    } catch (error) {
      console.error('Failed to initialize screen sharing:', error);
      setError('Please allow screen sharing to enable automatic captures');
      return null;
    }
  };

  const queryUserIntent = async (context: string) => {
    try {
      const response = await fetch('/api/context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: context }),
      });

      const data = await response.json();
      if (data.success && data.data && typeof data.data.response === 'string') {
        return data.data.response;
      }
      return null;
    } catch (error) {
      console.error('Error querying user intent:', error);
      return null;
    }
  };

  const captureIframe = async () => {
    if (!url || isCapturing || !iframeRef.current) return;
    
    setIsCapturing(true);
    try {
      let stream = streamRef.current;
      if (!stream) {
        stream = await initScreenShare();
        if (!stream) return;
      }

      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      video.srcObject = null;
      
      const screenshot = canvas.toDataURL('image/jpeg', 0.95);

      const response = await fetch('/api/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          screenshot,
          title: url
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid content type:', contentType);
        throw new Error('Server did not return JSON');
      }

      const data = await response.json();
      
      if (data.success) {
        setCurrentContext(data.analysis);
        const intentResult = await queryUserIntent(data.analysis);
        if (intentResult) {
          setUserIntent(intentResult);
        }
        setScreenshots(prev => [{
          url: data.screenshotUrl,
          timestamp: Date.now(),
          analysis: data.analysis
        }, ...prev]);
      } else {
        setError(data.error || 'Failed to capture screenshot');
      }
    } catch (error) {
      console.error('Error capturing iframe:', error);
      streamRef.current = null;
    } finally {
      setIsCapturing(false);
    }
  };

  useEffect(() => {
    if (url) {
      // Initial capture
      captureIframe();
      
      // Set interval to 10 seconds (10000 milliseconds)
      const interval = setInterval(captureIframe, 10000);
      
      // Cleanup on unmount or when url changes
      return () => clearInterval(interval);
    }
  }, [url]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (screenshotContainerRef.current) {
      screenshotContainerRef.current.scrollTop = 0;
    }
  }, [screenshots]);

  const handleChatSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userMessage = formData.get('message') as string;
    
    if (!userMessage.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    (e.target as HTMLFormElement).reset();
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          context: currentContext,
        }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error processing your message.' }]);
    }
  };

  // Add helper function to generate dynamic questions based on context
  const generateContextBasedQuestions = (context: string) => {
    const questions = [
      { id: '1', text: 'What is the main topic of this page?' },
      { id: '2', text: 'Can you summarize the key points?' },
      { id: '3', text: 'What are the main features shown?' },
      { id: '4', text: 'How has this page changed since the last capture?' },
      { id: '5', text: `Can you explain more about ${context.split(' ').slice(0, 3).join(' ')}...?` },
      { id: '6', text: 'What are the key takeaways from this page?' },
      { id: '7', text: 'Are there any important updates or changes?' },
      { id: '8', text: 'What is the most interesting aspect of this content?' }
    ];
    
    // Randomly select 4 questions
    return questions
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);
  };

  // Update the generateSuggestions function
  const generateSuggestions = (context: string) => {
    if (!context) return;
    setSuggestedQuestions(generateContextBasedQuestions(context));
  };

  // Add effect to update suggestions periodically
  useEffect(() => {
    if (currentContext) {
      generateSuggestions(currentContext);
      const interval = setInterval(() => {
        generateSuggestions(currentContext);
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [currentContext]);

  const handleSuggestedQuestionClick = (question: string) => {
    // Add message directly instead of simulating form event
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    
    // Make the API call directly
    fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: question,
        context: currentContext,
      }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        } else {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: 'Sorry, I encountered an error processing your message.' 
          }]);
        }
      })
      .catch(error => {
        console.error('Chat error:', error);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Sorry, I encountered an error processing your message.' 
        }]);
      });
  };

  const handleTranscription = async (text: string) => {
    // Add message directly
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          context: currentContext,
        }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your message.' 
      }]);
    }
  };

  const client = new ElevenLabsClient({
    apiKey: process.env.NEXT_PUBLIC_ELEVEN_LABS_API_KEY,
  });
  

  useEffect(() => {
    const lastMessage = messages.at(-1);
    if (lastMessage && lastMessage.role === 'assistant') {
      (async () => {
        try {
          const audioStream = await client.generate({
            voice: 'Rachel',
            model_id: 'eleven_turbo_v2_5',
            text: lastMessage.content,
          });
  
          const chunks: Buffer[] = [];
          for await (const chunk of audioStream) {
            chunks.push(chunk);
          }
          const content = Buffer.concat(chunks);
          
          // Convert buffer to blob
          const blob = new Blob([content], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          
          // Create and play audio
          const audio = new Audio(url);
          await audio.play();
          
          // Cleanup URL after audio is done playing
          audio.onended = () => {
            URL.revokeObjectURL(url);
          };
        } catch (error) {
          console.error('Error playing audio:', error);
        }
      })();
    }
  }, [messages]);

  return (
    <div className="min-h-[100dvh] bg-fixed bg-gradient-to-br from-gray-900 to-black">
      {/* Top Bar */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Navi
            </h1>
            <div className="h-4 w-[1px] bg-white/20 mx-2"></div>
            <p className="text-white/60 text-sm">
              Navigate Smarter: A Co-Pilot for Your Browser
            </p>
          </div>
          
          {userIntent && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              <div className="flex flex-row items-center gap-2">
                <span className="text-sm font-medium text-gray-400">User Intent:</span>
                <div className="w-[600px] bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full overflow-hidden hover:w-auto hover:max-w-3xl group transition-all duration-200">
                  <p className="text-sm text-blue-200 truncate group-hover:whitespace-normal">
                    {userIntent
                      .split(/[.,*]/) // Split by periods, commas, or asterisks
                      .map(intent => intent.trim()) // Trim whitespace
                      .map(intent => intent.includes(':') ? intent.split(':')[1].trim() : intent) // Remove everything before colon
                      .map(intent => intent
                        .replace(/^(based on the summary|it appears that|it seems that|the user is|the user appears to be|appears to be)/i, '')
                        .trim()
                      ) // Remove common prefixes
                      .filter(intent => intent.length > 0) // Remove empty strings
                      .slice(0, 3) // Take only first 3 intents
                      .join(' • ')
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs px-2 py-1 bg-gradient-to-r from-blue-400/10 to-blue-500/10 border border-blue-400/20 rounded-full text-blue-200">
                Powered by
                <Image 
                  src="/context.png"
                  alt="Powered by Context API"
                  width={64}
                  height={16}
                  className="opacity-80"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg backdrop-blur-sm mb-4">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-[2fr,1fr] gap-6 min-h-[90dvh] relative">
          <div className="flex flex-col gap-4 bg-white/5 p-6 rounded-2xl backdrop-blur-md border border-white/10">
            <form onSubmit={handleUrlSubmit} className="flex gap-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL..."
                className="flex-1 p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                required
                disabled={isLoading}
              />
              <Link
                href={url ? `/simplified?url=${encodeURIComponent(url)}` : '#'}
                className={`p-3 rounded-xl transition-all flex items-center gap-2 ${
                  url 
                    ? 'bg-blue-500/80 hover:bg-blue-500 text-white cursor-pointer' 
                    : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                <span className="text-sm font-medium">Simplify</span>
              </Link>
            </form>
            
            {url && (
              <div className="relative h-[600px] rounded-xl overflow-hidden border border-white/10">
                <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                  {isCapturing && (
                    <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-full shadow-lg border border-white/10">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium tracking-wide">Recording Screen</span>
                    </div>
                  )}
                </div>
                <iframe
                  ref={iframeRef}
                  src={url}
                  className="w-full h-full bg-white"
                  sandbox="allow-same-origin allow-scripts allow-forms"
                  loading="eager"
                  style={{ 
                    width: '100%',
                    height: '100%',
                    transform: 'scale(1)',
                    transformOrigin: 'top left'
                  }}
                />
              </div>
            )}

            {/* Screenshot History */}
            {screenshots.length > 0 && (
              <div className="mt-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <h3 className="text-lg font-semibold mb-3 text-white/90">Screenshot History</h3>
                <div 
                  ref={screenshotContainerRef}
                  className="grid grid-cols-4 gap-4 overflow-y-auto max-h-48 scroll-smooth"
                >
                  {screenshots.map((screenshot, index) => (
                    <div 
                      key={screenshot.timestamp}
                      className="group cursor-pointer relative overflow-hidden rounded-lg transition-transform hover:scale-105"
                      onClick={() => setCurrentContext(screenshot.analysis)}
                    >
                      <Image
                        src={screenshot.url}
                        alt={`Screenshot ${index + 1}`}
                        width={192}
                        height={108}
                        className="rounded-lg border border-white/10 w-full h-auto"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <div className="text-xs text-white/80">
                          {new Date(screenshot.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col h-full bg-white/5 rounded-2xl p-6 backdrop-blur-md border border-white/10">
            <div className="flex-1 overflow-y-auto mb-4 space-y-3">
              {messages.map((msg, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-2xl backdrop-blur-sm transition-all ${
                    msg.role === 'user' 
                      ? 'bg-blue-500/20 border border-blue-500/30 ml-auto max-w-[80%] text-blue-50' 
                      : 'bg-white/10 border border-white/20 mr-auto max-w-[80%] text-white/90'
                  }`}
                >
                  {msg.content}
                </div>
              ))}
            </div>
            
            {/* Suggested Questions */}
            {suggestedQuestions.length > 0 && messages.length === 0 && (
              <div className="mb-4">
                <div className="text-sm text-white/60 mb-3">Suggested Questions:</div>
                <div className="flex flex-wrap gap-2">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question.id}
                      onClick={() => handleSuggestedQuestionClick(question.text)}
                      className="text-sm px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-all text-white/90"
                    >
                      {question.text}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  name="message"
                  placeholder="Ask about the website..."
                  className="flex-1 p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                  required
                />
                <button 
                  type="submit"
                  className="p-3 bg-blue-500/80 hover:bg-blue-500 text-white rounded-xl transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
                <RecordButton onTranscription={handleTranscription} />

              </form>
            </div>

            <div className="mt-4 text-xs px-4 py-3 bg-gradient-to-r from-gray-900/80 to-black/80 backdrop-blur-sm border border-white/10 rounded-xl text-blue-200 flex items-center justify-between">
              <span className="text-white/60">Powered by</span>
              <div className="flex items-center gap-4">
                <Image 
                  src="/elevenlabs.png"
                  alt="Powered by ElevenLabs"
                  width={48}
                  height={20}
                  className="opacity-80 hover:opacity-100 transition-opacity"
                />
                <div className="w-[1px] h-4 bg-white/10"></div>
                <Image 
                  src="/groq.png"
                  alt="Powered by Mistral AI"
                  width={48}
                  height={20}
                  className="opacity-80 hover:opacity-100 transition-opacity"
                />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
