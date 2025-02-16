'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CircularText from './CircularText';
import Image from 'next/image';

function SimplifiedContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get('url');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndSimplify = async () => {
      if (!url) return;

      try {
        const response = await fetch('/api/simplify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          throw new Error('Failed to simplify content');
        }

        const data = await response.json();
        setContent(data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAndSimplify();
  }, [url]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <Link 
            href="/"
            className="text-sm px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-all text-white/90"
          >
            ← Back to Navi
          </Link>
          <div className="text-xs px-2 py-1 bg-gradient-to-r from-blue-400/10 to-blue-500/10 border border-blue-400/20 rounded-full text-blue-200 flex items-center gap-2">
            <Image
              src="/mistral.png"
              alt="Mistral AI Logo"
              width={24}
              height={24}
              className="opacity-80"
            />
            Powered by Mistral AI
          </div>
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
            <CircularText
              text="------------"
              onHover="speedUp"
              spinDuration={20}
              className="mb-4"
            />
            <div className="text-white/80">Generating simplified content...</div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl">
            {error}
          </div>
        ) : (
          <div className="bg-white/5 rounded-2xl backdrop-blur-md border border-white/10">
            <div className="p-8 text-white">
              <div 
                dangerouslySetInnerHTML={{ __html: content }}
                className="prose prose-invert max-w-none 
                  prose-h1:text-white prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-6
                  prose-h2:text-white prose-h2:text-xl prose-h2:font-semibold prose-h2:mb-4
                  prose-p:text-white/90 prose-p:mb-4
                  prose-ul:list-disc prose-ul:pl-4 prose-ul:space-y-2
                  prose-li:text-white/90
                  prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-a:underline
                  [&_section]:mb-8
                  [&_section:last-child]:mb-0
                  [&_section:last-child]:pt-8
                  [&_section:last-child]:border-t
                  [&_section:last-child]:border-white/10"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SimplifiedPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SimplifiedContent />
    </Suspense>
  );
} 