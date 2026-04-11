import { MatchDetails, MarketplaceListing } from '../types/marketplace.types';

export function useMatchScore(listing: MarketplaceListing, userProfile: any): MatchDetails {
  // In a real app, this would use a deterministic scoring function comparing:
  // listing.skills <-> userProfile.skills
  // listing.budget <-> userProfile.expectedRate
  // listing.isRemote <-> userProfile.prefersRemote
  
  // For the mock, we generate a deterministic score based on the listing ID length/chars
  // so it doesn't jump around.
  const seed = listing.id.charCodeAt(0) + (listing.id.length * 7);
  const randomScore = 65 + (seed % 30); // 65 to 95
  
  return {
    score: randomScore,
    factors: {
      skillsMatch: 3 + (seed % 3), // 3 to 5
      skillsTotal: 5,
      budgetFits: seed % 2 === 0,
      remoteOk: true,
      availabilityMatch: seed % 3 !== 0,
    }
  };
}
