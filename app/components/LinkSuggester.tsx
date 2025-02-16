import { useState, useEffect } from 'react';
import { findRelevantLinks, BrowsingHistory } from '../api/scrapy/scrapy-link-explore';

interface LinkSuggesterProps {
  currentUrl: string;
  history?: BrowsingHistory[];
}

export default function LinkSuggester({ currentUrl, history = [] }: LinkSuggesterProps) {
  // Hardcoded links instead of fetching
  const links: [string, string][] = [
    ["homepage", "https://treehacks-2025.devpost.com/"],
    ["homepage", "https://devpost.com"]
  ];

  /* Commenting out the fetching logic for now
  const [links, setLinks] = useState<[string, string][]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!currentUrl) return;

    const fetchLinks = async () => {
      setIsLoading(true);
      try {
        const relevantLinks = await findRelevantLinks(currentUrl, history);
        setLinks(relevantLinks);
      } catch (error) {
        console.error('Error finding relevant links:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinks();
  }, [currentUrl, history]);

  if (!links.length || isLoading) return null;
  */

  return (
    <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
      <div className="text-sm text-white/60 mb-2">Feeling lost? Suggested links:</div>
      <div className="space-y-2">
        {links.map(([description, url], index) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-400 hover:text-blue-300 transition-colors"
          >
            {index + 1}. {description}
          </a>
        ))}
      </div>
    </div>
  );
}
