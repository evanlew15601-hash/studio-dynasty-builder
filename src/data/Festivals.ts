export interface FestivalDef {
  id: string;
  name: string;
  prestige: number; // 0-100, higher -> stronger acclaim impact
  awards: string[]; // notable distinctions
  biddingAvailable?: boolean; // whether marketplace bidding is available
}

export const FESTIVALS: FestivalDef[] = [
  {
    id: 'cannes-like',
    name: "Palais d'Or Film Fest",
    prestige: 92,
    awards: ['Golden Palmette', 'Best Director', 'Best Actor'],
    biddingAvailable: true,
  },
  {
    id: 'sundance-like',
    name: 'Snowhaven Independent Film Fest',
    prestige: 74,
    awards: ['Audience Gem', 'Best Indie Feature'],
    biddingAvailable: true,
  },
  {
    id: 'venice-like',
    name: 'Laguna International Festival',
    prestige: 86,
    awards: ['Laurel Prize', 'Best Cinematography'],
    biddingAvailable: false,
  },
  {
    id: 'tiff-like',
    name: 'Maple City Film Showcase',
    prestige: 78,
    awards: ['Audience Choice', 'Critics Pick'],
    biddingAvailable: true,
  },
];

export function getFestivalById(id?: string) {
  if (!id) return undefined;
  return FESTIVALS.find((f) => f.id === id);
}

export function getFestivalOptions() {
  return FESTIVALS.map((f) => ({ id: f.id, label: f.name, prestige: f.prestige }));
}
