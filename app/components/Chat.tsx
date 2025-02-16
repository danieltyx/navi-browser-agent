import { useState } from 'react';
import VoiceRecorder from './VoiceRecorder';
import { speakText } from '../tts';

// ... existing imports and interface definitions ...

export default function Chat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleTranscription = async (text: string) => {
    setMessage(text);
    // Automatically send the transcribed message
    await handleSend(text);
  };

  const handleSend = async (textToSend?: string) => {
    console.log("=== Starting handleSend ===");
    const messageToSend = textToSend || message;
    if (!messageToSend.trim()) return;

    setIsLoading(true);
    try {
      console.log("Sending to API:", messageToSend);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageToSend }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("=== API Response ===", data);
      
      if (data.reply) {
        console.log("=== Starting TTS ===");
        try {
          await speakText(data.reply);
          console.log("=== TTS Complete ===");
        } catch (speechError) {
          console.error("TTS Error:", speechError);
        }
        setMessages([
          ...messages,
          { role: 'user', content: messageToSend },
          { role: 'assistant', content: data.reply }
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
      setMessage('');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="space-y-4 mb-4 h-[60vh] overflow-y-auto">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`p-4 rounded-lg ${
              msg.role === 'user' 
                ? 'bg-blue-100 ml-auto max-w-[80%]' 
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <div className="text-sm text-gray-600 mb-1">
              {msg.role === 'user' ? 'You' : 'Assistant'}
            </div>
            {msg.content}
          </div>
        ))}
      </div>
      
      <div className="flex items-center gap-2 sticky bottom-0 bg-white p-2 border-t">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <VoiceRecorder onTranscription={handleTranscription} />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !message.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
} 