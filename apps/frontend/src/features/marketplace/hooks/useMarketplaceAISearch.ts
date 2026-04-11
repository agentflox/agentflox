import { useState, useEffect } from 'react';
import { MarketplaceSearchIntent, ListingType } from '../types/marketplace.types';

export function useMarketplaceAISearch(query: string) {
  const [intent, setIntent] = useState<MarketplaceSearchIntent | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    if (!query || query.trim() === '') {
      setIntent(null);
      return;
    }

    // Debounce and mock AI intent parsing
    const timer = setTimeout(() => {
      setIsParsing(true);
      
      // Simulate API call to backend NLP service
      setTimeout(() => {
        const lowerQuery = query.toLowerCase();
        let inferredCategory: ListingType | undefined = undefined;
        let inferredSkills: string[] = [];
        let inferredDuration = undefined;

        if (lowerQuery.includes('developer') || lowerQuery.includes('dev') || lowerQuery.includes('designer')) {
          inferredCategory = 'talent';
        } else if (lowerQuery.includes('agent') || lowerQuery.includes('bot')) {
          inferredCategory = 'agent';
        } else if (lowerQuery.includes('project')) {
          inferredCategory = 'project';
        } else if (lowerQuery.includes('task')) {
          inferredCategory = 'task';
        }

        if (lowerQuery.includes('react')) inferredSkills.push('React');
        if (lowerQuery.includes('node') || lowerQuery.includes('nodejs')) inferredSkills.push('Node.js');
        if (lowerQuery.includes('python')) inferredSkills.push('Python');
        if (lowerQuery.includes('figma')) inferredSkills.push('Figma');

        if (lowerQuery.includes('weeks') || lowerQuery.includes('months')) {
          const match = lowerQuery.match(/(\d+)\s+(week|month)s?/);
          if (match) {
            inferredDuration = `${match[1]} ${match[2]}s`;
          } else {
            inferredDuration = 'short-term';
          }
        }

        setIntent({
          query,
          inferredCategory,
          inferredSkills,
          inferredDuration
        });
        
        setIsParsing(false);
      }, 400); // Network delay
    }, 500); // Typing debounce

    return () => clearTimeout(timer);
  }, [query]);

  return { intent, isParsing };
}
