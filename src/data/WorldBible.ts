import type { Gender, Genre, Race, RelationshipType } from '@/types/game';

export interface WorldFilmCredit {
  title: string;
  year: number;
  role: string;
  boxOffice?: number;
  /** Optional internal id if the game later creates canonical historical projects. */
  projectId?: string;
}

export interface WorldAwardCredit {
  year: number;
  ceremony:
    | 'Crown'
    | 'Crystal Ring'
    | 'Critics Circle'
    | 'Beacon TV'
    | 'Britannia Screen'
    | 'Performers Guild'
    | 'Directors Circle'
    | 'Writers Circle';
  category: string;
  prestige: number;
  projectTitle: string;
}

export interface WorldRelationshipBlueprint {
  with: string; // slug
  type: RelationshipType;
  note: string;
}

export interface WorldTalentBlueprint {
  slug: string;
  tier: 'marquee' | 'notable';
  name: string;
  type: 'actor' | 'director';
  gender: Gender;
  race?: Race;
  nationality: string;
  birthYear: number;
  careerStartYear: number;
  genres: Genre[];
  archetype: string;
  narratives: string[];
  movementTags?: string[];
  quirks?: string[];
  reputation: number;
  fame?: number; // actors only
  publicImage?: number;
  filmography?: WorldFilmCredit[];
  awards?: WorldAwardCredit[];
  relationships?: WorldRelationshipBlueprint[];
}

const T = {
  crown: 'Crown' as const,
  ring: 'Crystal Ring' as const,
  critics: 'Critics Circle' as const,
  beacon: 'Beacon TV' as const,
  britannia: 'Britannia Screen' as const,
  pg: 'Performers Guild' as const,
  dc: 'Directors Circle' as const,
  wc: 'Writers Circle' as const,
};

/**
 * Cornellverse-style anchors.
 *
 * Notes:
 * - All titles, awards, and people are fictional.
 * - projectTitle is stored on awards so we can display history without creating full Project objects.
 */
export const CORE_TALENT_BIBLE: WorldTalentBlueprint[] = [
  {
    slug: 'eleanor-vale',
    tier: 'marquee',
    name: 'Eleanor Vale',
    type: 'actor',
    gender: 'Female',
    nationality: 'British',
    race: 'White',
    birthYear: 1974,
    careerStartYear: 1995,
    genres: ['drama', 'historical', 'romance'],
    archetype: 'Prestige actress past her peak',
    narratives: ['Awards darling', 'Expensive but not commercially safe', 'Comeback watch'],
    movementTags: ['Festival Prestige Wave'],
    quirks: ['Demanding rehearsal schedule', 'Fiercely protective of directors she trusts'],
    reputation: 84,
    fame: 55,
    publicImage: 72,
    filmography: [
      { title: 'The Last Orchard', year: 1999, role: 'Lead Actor', boxOffice: 18_000_000 },
      { title: 'Winter’s Silence', year: 2008, role: 'Lead Actor', boxOffice: 82_000_000 },
      { title: 'City Without Memory', year: 2019, role: 'Lead Actor', boxOffice: 64_000_000 },
      { title: 'Fading Light', year: 2021, role: 'Lead Actor', boxOffice: 12_000_000 },
      { title: 'The Widow’s Garden', year: 2023, role: 'Lead Actor', boxOffice: 9_000_000 },
    ],
    awards: [
      { year: 1999, ceremony: T.critics, category: 'Breakthrough Performance', prestige: 6, projectTitle: 'The Last Orchard' },
      { year: 2008, ceremony: T.crown, category: 'Best Actress', prestige: 10, projectTitle: 'Winter’s Silence' },
      { year: 2008, ceremony: T.britannia, category: 'Best Actress', prestige: 8, projectTitle: 'Winter’s Silence' },
    ],
    relationships: [
      { with: 'jonah-pike', type: 'rivals', note: 'Infamous on-set feud during a troubled prestige remake; neither forgave the other.' },
      { with: 'maris-quinlan', type: 'mentor-mentee', note: 'Quiet mentor to a younger stage-trained actress who credits her for learning camera subtlety.' },
    ],
  },
  {
    slug: 'mateo-ionescu',
    tier: 'marquee',
    name: 'Mateo Ionescu',
    type: 'director',
    gender: 'Male',
    nationality: 'Romanian',
    race: 'White',
    birthYear: 1994,
    careerStartYear: 2018,
    genres: ['drama', 'thriller', 'mystery'],
    archetype: 'Visionary but undisciplined auteur',
    narratives: ['Festival darling', 'Runaway runtimes', 'Needs a strong editor'],
    movementTags: ['Post-Streaming Surrealism'],
    quirks: ['Shoots without storyboards', 'Refuses test screenings'],
    reputation: 78,
    publicImage: 61,
    filmography: [
      { title: 'Dreams of the Drowned City', year: 2019, role: 'Director', boxOffice: 14_000_000 },
      { title: 'The Glass Horizon', year: 2022, role: 'Director', boxOffice: 22_000_000 },
      { title: 'No Map for Night', year: 2024, role: 'Director', boxOffice: 31_000_000 },
    ],
    awards: [
      { year: 2019, ceremony: T.ring, category: 'Best Director', prestige: 7, projectTitle: 'Dreams of the Drowned City' },
      { year: 2022, ceremony: T.critics, category: 'Best Director', prestige: 7, projectTitle: 'The Glass Horizon' },
    ],
    relationships: [
      { with: 'selma-korovin', type: 'professional', note: 'A veteran editor repeatedly turned down his films; the snub is industry folklore.' },
      { with: 'nadia-serrano', type: 'friendly', note: 'Private supporter during her blacklist years; they trade scripts in secret.' },
    ],
  },
  {
    slug: 'calvin-stroud',
    tier: 'marquee',
    name: 'Calvin Stroud',
    type: 'director',
    gender: 'Male',
    nationality: 'American',
    race: 'White',
    birthYear: 1966,
    careerStartYear: 1992,
    genres: ['action', 'adventure', 'thriller'],
    archetype: 'Former blockbuster king whose films stopped working',
    narratives: ['Once untouchable', 'Audience drift', 'Desperate for a reinvention'],
    movementTags: ['Millennium Blockbuster Boom'],
    quirks: ['Loves practical stunts', 'Refuses second-unit directors'],
    reputation: 62,
    publicImage: 58,
    filmography: [
      { title: 'Steel Meridian', year: 2003, role: 'Director', boxOffice: 510_000_000 },
      { title: 'Skyfire Protocol', year: 2008, role: 'Director', boxOffice: 640_000_000 },
      { title: 'Goliath Drift', year: 2016, role: 'Director', boxOffice: 210_000_000 },
      { title: 'Overclock War', year: 2021, role: 'Director', boxOffice: 95_000_000 },
    ],
    awards: [
      { year: 2008, ceremony: T.pg, category: 'Outstanding Directing', prestige: 6, projectTitle: 'Skyfire Protocol' },
    ],
    relationships: [
      { with: 'jonah-pike', type: 'rivals', note: 'Two blockbuster architects who publicly argue about “real spectacle” versus “cheap noise”.' },
      { with: 'rina-matsuda', type: 'professional', note: 'Pinned his comeback hopes on her; negotiations collapsed over creative control.' },
    ],
  },
  {
    slug: 'nadia-serrano',
    tier: 'marquee',
    name: 'Nadia Serrano',
    type: 'director',
    gender: 'Female',
    nationality: 'Spanish',
    race: 'Latino',
    birthYear: 1978,
    careerStartYear: 2001,
    genres: ['crime', 'thriller', 'drama'],
    archetype: 'Controversial genius director informally blacklisted by major studios',
    narratives: ['Difficult genius', 'Festival legend', 'Studio risk'],
    movementTags: ['Neo-Noir Revival'],
    quirks: ['Rewrites scenes on the day', 'Never gives the same direction twice'],
    reputation: 79,
    publicImage: 42,
    filmography: [
      { title: 'Knives for Breakfast', year: 2006, role: 'Director', boxOffice: 44_000_000 },
      { title: 'Glass Saints', year: 2013, role: 'Director', boxOffice: 31_000_000 },
      { title: 'The Quiet Manhunt', year: 2018, role: 'Director', boxOffice: 9_000_000 },
      { title: 'No Witnesses', year: 2023, role: 'Director', boxOffice: 17_000_000 },
    ],
    awards: [
      { year: 2013, ceremony: T.critics, category: 'Best Director', prestige: 7, projectTitle: 'Glass Saints' },
      { year: 2013, ceremony: T.dc, category: 'Directing Achievement', prestige: 7, projectTitle: 'Glass Saints' },
    ],
    relationships: [
      { with: 'jonah-pike', type: 'hostile', note: 'He called her “uninsurable.” She never forgave him.' },
      { with: 'mateo-ionescu', type: 'friendly', note: 'Shares cuts and festival contacts; she calls him “reckless but honest”.' },
    ],
  },
  {
    slug: 'rina-matsuda',
    tier: 'marquee',
    name: 'Rina Matsuda',
    type: 'actor',
    gender: 'Female',
    nationality: 'Japanese',
    race: 'Asian',
    birthYear: 1996,
    careerStartYear: 2016,
    genres: ['thriller', 'sci-fi', 'drama'],
    archetype: 'Streaming-era star with massive reach and skeptical critics',
    narratives: ['Algorithm magnet', 'Critics dismiss her range', 'Brand-first casting'],
    movementTags: ['Streaming Thriller Boom'],
    quirks: ['Refuses press junkets longer than 48 hours', 'Chooses projects based on global release'],
    reputation: 69,
    fame: 86,
    publicImage: 88,
    filmography: [
      { title: 'Proxy Hearts', year: 2019, role: 'Lead Actor', boxOffice: 140_000_000 },
      { title: 'Signal Room', year: 2021, role: 'Lead Actor', boxOffice: 210_000_000 },
      { title: 'The Ninth App', year: 2024, role: 'Lead Actor', boxOffice: 260_000_000 },
    ],
    awards: [
      { year: 2021, ceremony: T.pg, category: 'Best Actress', prestige: 6, projectTitle: 'Signal Room' },
    ],
    relationships: [
      { with: 'eleanor-vale', type: 'professional', note: 'Respectful distance; studios love pairing them but schedules never align.' },
      { with: 'calvin-stroud', type: 'rivals', note: 'His camp blamed her for a stalled franchise. Her team blamed his scripts.' },
    ],
  },
  {
    slug: 'jonah-pike',
    tier: 'marquee',
    name: 'Jonah Pike',
    type: 'director',
    gender: 'Male',
    nationality: 'Canadian',
    race: 'White',
    birthYear: 1972,
    careerStartYear: 1998,
    genres: ['action', 'superhero', 'sci-fi'],
    archetype: 'Commercial blockbuster director with little critical respect',
    narratives: ['Reliable hitmaker', 'Critics sneer', 'Studio favorite'],
    movementTags: ['Franchise Industrial Era'],
    quirks: ['Shoots fast', 'Cuts dialogue to the bone'],
    reputation: 71,
    publicImage: 66,
    filmography: [
      { title: 'Quantum Marshal', year: 2014, role: 'Director', boxOffice: 780_000_000 },
      { title: 'Iron Angel', year: 2018, role: 'Director', boxOffice: 910_000_000 },
      { title: 'Orbitfall', year: 2022, role: 'Director', boxOffice: 640_000_000 },
    ],
    awards: [
      { year: 2018, ceremony: T.pg, category: 'Audience Choice Award', prestige: 5, projectTitle: 'Iron Angel' },
    ],
    relationships: [
      { with: 'eleanor-vale', type: 'rivals', note: 'She demanded more takes. He demanded fewer days. The press dined on it.' },
      { with: 'nadia-serrano', type: 'hostile', note: 'He lobbied against her hiring at multiple studios.' },
      { with: 'calvin-stroud', type: 'rivals', note: 'Competed for the same IP for years; neither admits it bothers them.' },
    ],
  },
  {
    slug: 'selma-korovin',
    tier: 'marquee',
    name: 'Selma Korovin',
    type: 'director',
    gender: 'Female',
    nationality: 'Polish',
    race: 'White',
    birthYear: 1969,
    careerStartYear: 1994,
    genres: ['drama', 'historical', 'mystery'],
    archetype: 'Prestige director with legendary discipline (the “fixer” studios call)',
    narratives: ['On-time, under-budget', 'Actor whisperer', 'Awards-calibrated'],
    movementTags: ['Modern Prestige Pipeline'],
    quirks: ['Cuts pages in rehearsal', 'Requires final cut on performances'],
    reputation: 88,
    publicImage: 74,
    filmography: [
      { title: 'Paper Kingdom', year: 2004, role: 'Director', boxOffice: 96_000_000 },
      { title: 'Amber Winter', year: 2011, role: 'Director', boxOffice: 71_000_000 },
      { title: 'The Fifth Portrait', year: 2019, role: 'Director', boxOffice: 58_000_000 },
      { title: 'A Map of Quiet', year: 2023, role: 'Director', boxOffice: 64_000_000 },
    ],
    awards: [
      { year: 2011, ceremony: T.crown, category: 'Best Director', prestige: 9, projectTitle: 'Amber Winter' },
      { year: 2019, ceremony: T.critics, category: 'Best Director', prestige: 7, projectTitle: 'The Fifth Portrait' },
    ],
    relationships: [
      { with: 'mateo-ionescu', type: 'professional', note: 'She refuses to work with him until he agrees to a strict post schedule.' },
      { with: 'maris-quinlan', type: 'mentor-mentee', note: 'Mentored her during a bleak early-career stretch; loyalty remains.' },
    ],
  },

  // --- Additional marquee anchors (kept concise; depth comes from archetype + narrative tags) ---
  {
    slug: 'maris-quinlan',
    tier: 'marquee',
    name: 'Maris Quinlan',
    type: 'actor',
    gender: 'Female',
    nationality: 'Irish',
    race: 'White',
    birthYear: 1989,
    careerStartYear: 2010,
    genres: ['drama', 'crime', 'thriller'],
    archetype: 'Classically trained actress with a sharp edge',
    narratives: ['Prestige magnet', 'Quietly intimidating on set'],
    movementTags: ['Neo-Noir Revival'],
    quirks: ['Refuses chemistry reads', 'Writes detailed character journals'],
    reputation: 81,
    fame: 63,
    filmography: [
      { title: 'Morrow Street', year: 2012, role: 'Lead Actor', boxOffice: 41_000_000 },
      { title: 'Razor Hymn', year: 2017, role: 'Lead Actor', boxOffice: 88_000_000 },
      { title: 'A Map of Quiet', year: 2023, role: 'Lead Actor', boxOffice: 64_000_000 },
    ],
    awards: [
      { year: 2017, ceremony: T.critics, category: 'Best Actress', prestige: 7, projectTitle: 'Razor Hymn' },
    ],
    relationships: [
      { with: 'eleanor-vale', type: 'mentor-mentee', note: 'Eleanor taught her to weaponize stillness on camera.' },
      { with: 'selma-korovin', type: 'mentor-mentee', note: 'Selma rescued her from a disastrous contract and gave her a lead.' },
    ],
  },
  {
    slug: 'dante-vero',
    tier: 'marquee',
    name: 'Dante Vero',
    type: 'actor',
    gender: 'Male',
    nationality: 'Italian',
    race: 'White',
    birthYear: 1981,
    careerStartYear: 2002,
    genres: ['crime', 'drama', 'thriller'],
    archetype: 'Charismatic lead with tabloid volatility',
    narratives: ['Box office swing', 'PR risk', 'Electric on screen'],
    quirks: ['Changes his hair mid-shoot', 'Late-night rewrite suggestions'],
    reputation: 68,
    fame: 77,
  },
  {
    slug: 'imani-brooks',
    tier: 'marquee',
    name: 'Imani Brooks',
    type: 'actor',
    gender: 'Female',
    nationality: 'American',
    race: 'Black',
    birthYear: 1984,
    careerStartYear: 2006,
    genres: ['drama', 'biography', 'historical'],
    archetype: 'Prestige powerhouse who keeps turning down franchises',
    narratives: ['Awards threat every year', 'Selective and political'],
    movementTags: ['Modern Prestige Pipeline'],
    quirks: ['Demands rehearsal weeks', 'Never does sequels'],
    reputation: 90,
    fame: 70,
  },
  {
    slug: 'lex-holloway',
    tier: 'marquee',
    name: 'Lex Holloway',
    type: 'actor',
    gender: 'Male',
    nationality: 'Australian',
    race: 'White',
    birthYear: 1991,
    careerStartYear: 2011,
    genres: ['action', 'adventure', 'superhero'],
    archetype: 'Physical performer turned franchise face',
    narratives: ['Stunt-friendly', 'Beloved by marketing', 'Critics shrug'],
    movementTags: ['Franchise Industrial Era'],
    quirks: ['Does his own training content', 'Refuses heavy prosthetics'],
    reputation: 66,
    fame: 88,
  },
  {
    slug: 'harper-quibble',
    tier: 'marquee',
    name: 'Harper Quibble',
    type: 'director',
    gender: 'Male',
    nationality: 'American',
    race: 'White',
    birthYear: 1982,
    careerStartYear: 2006,
    genres: ['comedy', 'drama', 'romance'],
    archetype: 'Comedy director who insists every joke has “character truth”',
    narratives: ['Studio favorite for “smart crowd-pleasers”', 'Talks like a therapist in press junkets', 'Accidentally spawns memes'],
    movementTags: ['Studio Comedy Renaissance'],
    quirks: ['Bans the word “funny” on set', 'Does table reads like group therapy'],
    reputation: 73,
    publicImage: 81,
    filmography: [
      { title: 'The Polite Disaster', year: 2011, role: 'Director', boxOffice: 98_000_000 },
      { title: 'Two Weeks of Honesty', year: 2016, role: 'Director', boxOffice: 124_000_000 },
      { title: 'Apology Tour', year: 2022, role: 'Director', boxOffice: 76_000_000 },
    ],
    awards: [
      { year: 2016, ceremony: T.ring, category: 'Best Director - Comedy/Musical', prestige: 6, projectTitle: 'Two Weeks of Honesty' },
      { year: 2016, ceremony: T.wc, category: 'Best Original Screenplay', prestige: 7, projectTitle: 'Two Weeks of Honesty' },
    ],
    relationships: [
      { with: 'vince-ravel', type: 'friendly', note: 'They “found the scene” together during an improv meltdown that became a trailer moment.' },
      { with: 'rachel-voight', type: 'professional', note: 'Shared a long-running pact: no jokes after midnight, no rewrites before coffee.' },
      { with: 'nadia-serrano', type: 'rivals', note: 'He called her films “anti-laughter.” She called his “pro-merch.”' },
    ],
  },
  {
    slug: 'gunnar-slate',
    tier: 'marquee',
    name: 'Gunnar Slate',
    type: 'director',
    gender: 'Male',
    nationality: 'American',
    race: 'White',
    birthYear: 1975,
    careerStartYear: 1997,
    genres: ['action', 'sci-fi', 'thriller'],
    archetype: 'Maximalist action director with a philosophy degree and no volume knob',
    narratives: ['Trailer king', 'Crew weirdly loyal', 'Critics beg for earplugs'],
    movementTags: ['Millennium Blockbuster Boom'],
    quirks: ['Has a “no quiet takes” rule', 'Treats lens flares like punctuation'],
    reputation: 63,
    publicImage: 54,
    filmography: [
      { title: 'Heat Signature', year: 2005, role: 'Director', boxOffice: 450_000_000 },
      { title: 'Meteor Law', year: 2012, role: 'Director', boxOffice: 620_000_000 },
      { title: 'Night Engine', year: 2020, role: 'Director', boxOffice: 310_000_000 },
    ],
    awards: [
      { year: 2012, ceremony: T.pg, category: 'Outstanding Stunt Ensemble', prestige: 6, projectTitle: 'Meteor Law' },
    ],
    relationships: [
      { with: 'jonah-pike', type: 'rivals', note: 'They compete for the same franchises and the same headline space.' },
      { with: 'calvin-stroud', type: 'friendly', note: 'Bonded over practical stunts; argues with him about the meaning of “restraints.”' },
      { with: 'owen-trask', type: 'professional', note: 'Owen builds the toys. Gunnar sets them on fire (politely, in pre-vis).' },
    ],
  },
  {
    slug: 'brock-stormer',
    tier: 'marquee',
    name: 'Brock Stormer',
    type: 'actor',
    gender: 'Male',
    nationality: 'American',
    race: 'White',
    birthYear: 1987,
    careerStartYear: 2007,
    genres: ['action', 'adventure', 'sports'],
    archetype: 'Brand-safe action star with suspiciously intense cardio advice',
    narratives: ['Merch magnet', 'Secret comedy chops', 'Studios love his press tours'],
    movementTags: ['Franchise Industrial Era'],
    quirks: ['Turns every interview into a hydration lecture', 'Insists on doing the “one impossible shot”'],
    reputation: 64,
    fame: 90,
    publicImage: 84,
    filmography: [
      { title: 'Northbound Hit', year: 2015, role: 'Lead Actor', boxOffice: 280_000_000 },
      { title: 'The Last Overtime', year: 2019, role: 'Lead Actor', boxOffice: 190_000_000 },
      { title: 'Ridge Runner', year: 2023, role: 'Lead Actor', boxOffice: 240_000_000 },
    ],
    relationships: [
      { with: 'lex-holloway', type: 'rivals', note: 'Friendly rivalry that marketing teams keep trying to turn into a “shared universe.”' },
      { with: 'rina-matsuda', type: 'professional', note: 'Their teams tried to engineer chemistry. It worked, annoyingly.' },
    ],
  },

  // --- Notable tier: large fixed pool; lighter detail but consistent identity ---
  ...buildNotablePool(),
];

function buildNotablePool(): WorldTalentBlueprint[] {
  const base: Array<Omit<WorldTalentBlueprint, 'tier' | 'filmography' | 'awards' | 'relationships'>> = [
    {
      slug: 'hayden-keats',
      name: 'Hayden Keats',
      type: 'director',
      gender: 'Male',
      nationality: 'American',
      race: 'White',
      birthYear: 1980,
      careerStartYear: 2007,
      genres: ['horror', 'thriller'],
      archetype: 'Elevated horror craftsman who hates jump scares',
      narratives: ['Critics love him', 'Audiences are split'],
      movementTags: ['Elevated Horror'],
      quirks: ['Shoots long takes', 'Minimal coverage'],
      reputation: 74,
    },
    {
      slug: 'safiya-nasser',
      name: 'Safiya Nasser',
      type: 'actor',
      gender: 'Female',
      nationality: 'Egyptian',
      race: 'Middle Eastern',
      birthYear: 1990,
      careerStartYear: 2012,
      genres: ['drama', 'romance'],
      archetype: 'Romantic lead with a serious-theater core',
      narratives: ['Beloved internationally', 'Underused domestically'],
      quirks: ['Requires dialect coach on contract', 'Writes backstory scenes'],
      reputation: 70,
      fame: 62,
    },
    {
      slug: 'owen-trask',
      name: 'Owen Trask',
      type: 'director',
      gender: 'Male',
      nationality: 'British',
      race: 'White',
      birthYear: 1976,
      careerStartYear: 2000,
      genres: ['sci-fi', 'action'],
      archetype: 'Technical futurist who can’t write humans',
      narratives: ['Visual genius', 'Cold scripts'],
      movementTags: ['Digital Innovation Wave'],
      quirks: ['Edits on set', 'Demands custom lenses'],
      reputation: 69,
    },
    {
      slug: 'luz-caraballo',
      name: 'Luz Caraballo',
      type: 'actor',
      gender: 'Female',
      nationality: 'Mexican',
      race: 'Latino',
      birthYear: 1987,
      careerStartYear: 2008,
      genres: ['crime', 'thriller', 'drama'],
      archetype: 'Noir specialist with quiet ferocity',
      narratives: ['Reliable scene-stealer', 'Low tabloid presence'],
      movementTags: ['Neo-Noir Revival'],
      quirks: ['Never improvises', 'Obsessive continuity'],
      reputation: 73,
      fame: 60,
    },
  ];

  // Expand with a curated (non-random) roster.
  const extraNames: Array<{
    slug: string;
    name: string;
    type: 'actor' | 'director';
    gender: Gender;
    nationality: string;
    race: Race;
    birthYear: number;
    careerStartYear: number;
    genres: Genre[];
    archetype: string;
    narratives: string[];
    movementTags?: string[];
    quirks?: string[];
    reputation: number;
    fame?: number;
  }> = [
    { slug: 'vince-ravel', name: 'Vince Ravel', type: 'actor', gender: 'Male', nationality: 'American', race: 'White', birthYear: 1979, careerStartYear: 2001, genres: ['comedy', 'drama'], archetype: 'Comedy lead trying to be taken seriously', narratives: ['Typecast escape attempt'], quirks: ['Adds jokes in drama scenes'], reputation: 61, fame: 65 },
    { slug: 'talia-soren', name: 'Talia Soren', type: 'director', gender: 'Female', nationality: 'Swedish', race: 'White', birthYear: 1986, careerStartYear: 2010, genres: ['drama', 'mystery'], archetype: 'Cold-blooded minimalist with awards instincts', narratives: ['Prestige lane', 'Unforgiving on pacing'], movementTags: ['Festival Prestige Wave'], quirks: ['Cuts exposition', 'No handheld cameras'], reputation: 77 },
    { slug: 'gabe-ikeda', name: 'Gabe Ikeda', type: 'director', gender: 'Male', nationality: 'Japanese', race: 'Asian', birthYear: 1983, careerStartYear: 2009, genres: ['animation', 'family', 'fantasy'], archetype: 'Animation auteur with cult adults following', narratives: ['Merchandise gold', 'Personal films'], movementTags: ['Animation Renaissance'], quirks: ['Draws storyboards himself'], reputation: 80 },
    { slug: 'alina-vetrova', name: 'Alina Vetrova', type: 'actor', gender: 'Female', nationality: 'Russian', race: 'White', birthYear: 1993, careerStartYear: 2014, genres: ['sci-fi', 'thriller'], archetype: 'Ice-cool genre star with surprising range', narratives: ['Quietly building prestige cred'], movementTags: ['Streaming Thriller Boom'], quirks: ['No social media'], reputation: 67, fame: 71 },
    { slug: 'samir-khan', name: 'Samir Khan', type: 'actor', gender: 'Male', nationality: 'Pakistani', race: 'Middle Eastern', birthYear: 1988, careerStartYear: 2010, genres: ['drama', 'biography'], archetype: 'Biopic specialist with intense preparation', narratives: ['Awards chatter regular'], quirks: ['Stays in character off set'], reputation: 76, fame: 58 },
    { slug: 'rachel-voight', name: 'Rachel Voight', type: 'director', gender: 'Female', nationality: 'American', race: 'White', birthYear: 1974, careerStartYear: 1999, genres: ['comedy', 'romance'], archetype: 'Crowd-pleaser director with sharp pacing', narratives: ['Reliable mid-budget hits'], quirks: ['Improvisation-heavy takes'], reputation: 68 },
    { slug: 'diego-leroux', name: 'Diego Leroux', type: 'director', gender: 'Male', nationality: 'French', race: 'White', birthYear: 1971, careerStartYear: 1996, genres: ['crime', 'thriller'], archetype: 'Old-school thriller craftsman', narratives: ['Professional', 'Never flashy'], movementTags: ['Neo-Noir Revival'], quirks: ['Storyboards every shot'], reputation: 70 },
    { slug: 'hye-jin-park', name: 'Hye-jin Park', type: 'actor', gender: 'Female', nationality: 'Korean', race: 'Asian', birthYear: 1995, careerStartYear: 2015, genres: ['drama', 'thriller'], archetype: 'Prestige-to-streaming crossover star', narratives: ['Big global fanbase'], movementTags: ['Streaming Thriller Boom'], quirks: ['Prefers ensemble casts'], reputation: 73, fame: 79 },
    { slug: 'malcolm-ryder', name: 'Malcolm Ryder', type: 'actor', gender: 'Male', nationality: 'British', race: 'White', birthYear: 1964, careerStartYear: 1986, genres: ['historical', 'drama'], archetype: 'Veteran character actor who elevates anything', narratives: ['Trusted by directors'], quirks: ['One-take perfection'], reputation: 82, fame: 45 },
    { slug: 'sienna-choi', name: 'Sienna Choi', type: 'director', gender: 'Female', nationality: 'Korean', race: 'Asian', birthYear: 1990, careerStartYear: 2016, genres: ['thriller', 'mystery'], archetype: 'Tight, twisty thriller director', narratives: ['Studio trust rising'], quirks: ['Relentless coverage'], reputation: 72 },
    { slug: 'omar-aziz', name: 'Omar Aziz', type: 'director', gender: 'Male', nationality: 'Moroccan', race: 'Middle Eastern', birthYear: 1982, careerStartYear: 2008, genres: ['drama', 'historical'], archetype: 'Humanist director obsessed with authenticity', narratives: ['Prestige circuit'], movementTags: ['Festival Prestige Wave'], quirks: ['Shoots on location only'], reputation: 75 },
    { slug: 'cassidy-wren', name: 'Cassidy Wren', type: 'actor', gender: 'Female', nationality: 'American', race: 'White', birthYear: 1998, careerStartYear: 2018, genres: ['horror', 'thriller'], archetype: 'Modern scream queen who wants drama respect', narratives: ['Rising'], movementTags: ['Elevated Horror'], quirks: ['Does stunt training'], reputation: 62, fame: 68 },
    { slug: 'edgar-sloan', name: 'Edgar Sloan', type: 'actor', gender: 'Male', nationality: 'American', race: 'White', birthYear: 1992, careerStartYear: 2012, genres: ['action', 'crime'], archetype: 'Reliable supporting bruiser', narratives: ['Always books work'], quirks: ['Improvises fights'], reputation: 58, fame: 60 },
    { slug: 'yara-haddad', name: 'Yara Haddad', type: 'actor', gender: 'Female', nationality: 'Lebanese', race: 'Middle Eastern', birthYear: 1985, careerStartYear: 2007, genres: ['drama', 'romance'], archetype: 'Prestige actress with strong public image', narratives: ['Charity darling'], quirks: ['Extensive table reads'], reputation: 78, fame: 57 },
    { slug: 'pavel-drago', name: 'Pavel Drago', type: 'director', gender: 'Male', nationality: 'Serbian', race: 'White', birthYear: 1977, careerStartYear: 2002, genres: ['war', 'historical', 'drama'], archetype: 'Hard-edged realist director', narratives: ['Feared on set', 'Respected in post'], movementTags: ['War Realism Revival'], quirks: ['Runs military-style sets'], reputation: 73 },
    { slug: 'polly-pastiche', name: 'Polly Pastiche', type: 'actor', gender: 'Female', nationality: 'British', race: 'White', birthYear: 1992, careerStartYear: 2013, genres: ['comedy', 'drama'], archetype: 'Scene-stealer with a thousand impressions', narratives: ['Too funny to ignore', 'Prestige directors keep “discovering” her'], quirks: ['Does accents as a warmup'], reputation: 66, fame: 74 },
    { slug: 'kieran-boom', name: 'Kieran Boom', type: 'director', gender: 'Male', nationality: 'Irish', race: 'White', birthYear: 1984, careerStartYear: 2009, genres: ['action', 'comedy'], archetype: 'Commercial director who treats setpieces like punchlines', narratives: ['Reliable crowd heat', 'Critics call it “loud, but honest”'], quirks: ['Times jokes with explosions'], reputation: 64 },
  ];

  const expanded = [...base, ...extraNames.map((x) => ({ ...x }))].map((x) => ({
    ...x,
    tier: 'notable' as const,
  }));

  // Pad to a stable 110-person core by adding additional fixed entries.
  // These are intentionally short-form; the generator will derive consistent filmographies.
  const pad: WorldTalentBlueprint[] = [];
  const padActors = [
    ['nina-ross', 'Nina Ross', 'Female', 'American', 'White'],
    ['amir-bassam', 'Amir Bassam', 'Male', 'Jordanian', 'Middle Eastern'],
    ['clara-voss', 'Clara Voss', 'Female', 'German', 'White'],
    ['teo-silva', 'Teo Silva', 'Male', 'Brazilian', 'Latino'],
    ['min-ji-kang', 'Min-ji Kang', 'Female', 'Korean', 'Asian'],
    ['rafael-cortez', 'Rafael Cortez', 'Male', 'Mexican', 'Latino'],
    ['soraya-malik', 'Soraya Malik', 'Female', 'Indian', 'Mixed'],
    ['luca-bianchi', 'Luca Bianchi', 'Male', 'Italian', 'White'],
    ['valerie-kent', 'Valerie Kent', 'Female', 'Canadian', 'White'],
    ['adele-noir', 'Adele Noir', 'Female', 'French', 'White'],
    ['jalen-price', 'Jalen Price', 'Male', 'American', 'Black'],
    ['hugo-mercier', 'Hugo Mercier', 'Male', 'French', 'White'],
    ['irina-kuznets', 'Irina Kuznets', 'Female', 'Ukrainian', 'White'],
    ['maia-ferreira', 'Maia Ferreira', 'Female', 'Portuguese', 'White'],
    ['solomon-reed', 'Solomon Reed', 'Male', 'American', 'Black'],
    ['elise-barnett', 'Elise Barnett', 'Female', 'American', 'White'],
    ['darius-wolfe', 'Darius Wolfe', 'Male', 'American', 'Black'],
    ['sofia-delmar', 'Sofia Delmar', 'Female', 'Spanish', 'Latino'],
    ['juno-kassai', 'Juno Kassai', 'Female', 'Hungarian', 'White'],
    ['mikhail-antonov', 'Mikhail Antonov', 'Male', 'Russian', 'White'],
    ['yasmin-kader', 'Yasmin Kader', 'Female', 'Turkish', 'Middle Eastern'],
    ['enzo-mancini', 'Enzo Mancini', 'Male', 'Italian', 'White'],
    ['hannah-rivers', 'Hannah Rivers', 'Female', 'British', 'White'],
    ['kai-nakamura', 'Kai Nakamura', 'Male', 'Japanese', 'Asian'],
    ['amara-nyambe', 'Amara Nyambe', 'Female', 'Kenyan', 'Black'],
    ['lucas-fairchild', 'Lucas Fairchild', 'Male', 'Canadian', 'White'],
    ['naomi-levine', 'Naomi Levine', 'Female', 'Israeli', 'Middle Eastern'],
    ['tony-park', 'Tony Park', 'Male', 'Korean', 'Asian'],
    ['celine-durand', 'Celine Durand', 'Female', 'French', 'White'],
    ['mara-ostberg', 'Mara Ostberg', 'Female', 'Swedish', 'White'],
    ['santiago-reyes', 'Santiago Reyes', 'Male', 'Colombian', 'Latino'],
    ['leila-bashir', 'Leila Bashir', 'Female', 'Moroccan', 'Middle Eastern'],
    ['patrick-stone', 'Patrick Stone', 'Male', 'Australian', 'White'],
    ['ivy-chang', 'Ivy Chang', 'Female', 'Chinese', 'Asian'],
    ['emil-novak', 'Emil Novak', 'Male', 'Czech', 'White'],
    ['noura-hassan', 'Noura Hassan', 'Female', 'Egyptian', 'Middle Eastern'],
    ['gabriel-souza', 'Gabriel Souza', 'Male', 'Brazilian', 'Latino'],
    ['sienna-marsh', 'Sienna Marsh', 'Female', 'American', 'White'],
    ['rohan-singh', 'Rohan Singh', 'Male', 'Indian', 'Mixed'],
    ['aurora-bennett', 'Aurora Bennett', 'Female', 'Canadian', 'White'],
    ['felix-ortiz', 'Felix Ortiz', 'Male', 'Mexican', 'Latino'],
    ['linnea-stahl', 'Linnea Stahl', 'Female', 'German', 'White'],
    ['zara-abadi', 'Zara Abadi', 'Female', 'Iranian', 'Middle Eastern'],
    ['samuel-kent', 'Samuel Kent', 'Male', 'British', 'White'],
    ['aisha-mensah', 'Aisha Mensah', 'Female', 'Ghanaian', 'Black'],
    ['marco-gianni', 'Marco Gianni', 'Male', 'Italian', 'White'],
    ['delia-estrada', 'Delia Estrada', 'Female', 'Argentinian', 'Latino'],
    ['julian-crowe', 'Julian Crowe', 'Male', 'American', 'White'],
    ['mina-jafari', 'Mina Jafari', 'Female', 'Iranian', 'Middle Eastern'],
    ['tariq-sadiq', 'Tariq Sadiq', 'Male', 'Pakistani', 'Middle Eastern'],
    ['laila-qasem', 'Laila Qasem', 'Female', 'Iraqi', 'Middle Eastern'],
    ['pietro-lucchi', 'Pietro Lucchi', 'Male', 'Italian', 'White'],
    ['grace-hawley', 'Grace Hawley', 'Female', 'Australian', 'White'],
    ['oliver-bishop', 'Oliver Bishop', 'Male', 'British', 'White'],
    ['hana-tanaka', 'Hana Tanaka', 'Female', 'Japanese', 'Asian'],
    ['sergio-alonso', 'Sergio Alonso', 'Male', 'Spanish', 'Latino'],
    ['mia-kowalski', 'Mia Kowalski', 'Female', 'Polish', 'White'],
    ['amina-rahman', 'Amina Rahman', 'Female', 'Bangladeshi', 'Mixed'],
    ['noel-kapoor', 'Noel Kapoor', 'Male', 'Indian', 'Mixed'],
    ['keira-oshea', 'Keira O’Shea', 'Female', 'Irish', 'White'],
    ['daichi-sato', 'Daichi Sato', 'Male', 'Japanese', 'Asian'],
    ['bianca-romero', 'Bianca Romero', 'Female', 'Mexican', 'Latino'],
    ['lucia-ibarra', 'Lucia Ibarra', 'Female', 'Spanish', 'Latino'],
    ['hassan-elmasry', 'Hassan Elmasry', 'Male', 'Egyptian', 'Middle Eastern'],
    ['jonas-lind', 'Jonas Lind', 'Male', 'Swedish', 'White'],
    ['kendra-fitz', 'Kendra Fitz', 'Female', 'American', 'White'],
    ['tomas-krall', 'Tomas Krall', 'Male', 'Czech', 'White'],
    ['samira-ali', 'Samira Ali', 'Female', 'Pakistani', 'Middle Eastern'],
    ['deon-carter', 'Deon Carter', 'Male', 'American', 'Black'],
    ['chloe-marchand', 'Chloe Marchand', 'Female', 'French', 'White'],
    ['anaya-patel', 'Anaya Patel', 'Female', 'Indian', 'Mixed'],
    ['matthew-grant', 'Matthew Grant', 'Male', 'Canadian', 'White'],
    ['helena-varga-actor', 'Helena Varga', 'Female', 'Hungarian', 'White'],
  ] as const;

  const padDirectors = [
    ['bruno-salazar', 'Bruno Salazar', 'Male', 'Spanish', 'Latino'],
    ['helen-varga-dir', 'Helen Varga', 'Female', 'Hungarian', 'White'],
    ['kaito-hirano', 'Kaito Hirano', 'Male', 'Japanese', 'Asian'],
    ['marina-klein', 'Marina Klein', 'Female', 'German', 'White'],
    ['pierre-duval', 'Pierre Duval', 'Male', 'French', 'White'],
    ['zoya-petrenko', 'Zoya Petrenko', 'Female', 'Ukrainian', 'White'],
    ['rashid-alam', 'Rashid Alam', 'Male', 'Indian', 'Mixed'],
    ['noah-ashcroft', 'Noah Ashcroft', 'Male', 'British', 'White'],
    ['tess-morrow', 'Tess Morrow', 'Female', 'American', 'White'],
    ['han-ryu', 'Han Ryu', 'Male', 'Korean', 'Asian'],
    ['greta-halvorsen', 'Greta Halvorsen', 'Female', 'Norwegian', 'White'],
    ['marco-santori', 'Marco Santori', 'Male', 'Italian', 'White'],
    ['salim-haddad', 'Salim Haddad', 'Male', 'Lebanese', 'Middle Eastern'],
    ['anya-vokov', 'Anya Vokov', 'Female', 'Russian', 'White'],
    ['carmen-ibanez', 'Carmen Ibañez', 'Female', 'Spanish', 'Latino'],
    ['satoshi-kimura', 'Satoshi Kimura', 'Male', 'Japanese', 'Asian'],
    ['lena-varga', 'Lena Varga', 'Female', 'Hungarian', 'White'],
    ['miles-harrington', 'Miles Harrington', 'Male', 'American', 'White'],
    ['roberto-costa', 'Roberto Costa', 'Male', 'Brazilian', 'Latino'],
    ['yasir-najjar', 'Yasir Najjar', 'Male', 'Jordanian', 'Middle Eastern'],
    ['chandra-basu', 'Chandra Basu', 'Female', 'Indian', 'Mixed'],
    ['amelie-caron', 'Amelie Caron', 'Female', 'French', 'White'],
    ['eirik-solheim', 'Eirik Solheim', 'Male', 'Norwegian', 'White'],
    ['matteo-galli', 'Matteo Galli', 'Male', 'Italian', 'White'],
    ['yoon-seok-min', 'Yoon-seok Min', 'Male', 'Korean', 'Asian'],
    ['nadine-fischer', 'Nadine Fischer', 'Female', 'German', 'White'],
    ['luis-moreno', 'Luis Moreno', 'Male', 'Mexican', 'Latino'],
    ['sara-al-fayed', 'Sara Al-Fayed', 'Female', 'Egyptian', 'Middle Eastern'],
    ['timur-kasparov', 'Timur Kasparov', 'Male', 'Ukrainian', 'White'],
    ['orla-donovan', 'Orla Donovan', 'Female', 'Irish', 'White'],
    ['david-hartwell', 'David Hartwell', 'Male', 'British', 'White'],
    ['sylvie-moreau', 'Sylvie Moreau', 'Female', 'French', 'White'],
    ['hugo-lambert', 'Hugo Lambert', 'Male', 'Canadian', 'White'],
    ['maya-ghosh', 'Maya Ghosh', 'Female', 'Indian', 'Mixed'],
    ['jin-woo-seo', 'Jin-woo Seo', 'Male', 'Korean', 'Asian'],
    ['karim-benaissa', 'Karim Benaissa', 'Male', 'Moroccan', 'Middle Eastern'],
    ['elena-sarkis', 'Elena Sarkis', 'Female', 'Lebanese', 'Middle Eastern'],
    ['tristan-cole', 'Tristan Cole', 'Male', 'American', 'White'],
    ['ines-fonseca', 'Ines Fonseca', 'Female', 'Portuguese', 'White'],
    ['giulia-martelli', 'Giulia Martelli', 'Female', 'Italian', 'White'],
  ] as const;

  const toGenre = (i: number): Genre[] => {
    const g: Genre[] = ['drama', 'thriller', 'crime', 'comedy', 'horror', 'sci-fi', 'romance', 'historical', 'action'];
    return [g[i % g.length], g[(i + 2) % g.length]] as Genre[];
  };

  let idx = 0;
  for (const [slug, name, gender, nationality, race] of padActors) {
    const genres = toGenre(idx);
    pad.push({
      slug,
      tier: 'notable',
      name,
      type: 'actor',
      gender: gender as Gender,
      nationality,
      race: race as Race,
      birthYear: 1978 + (idx % 18),
      careerStartYear: 2000 + (idx % 18),
      genres,
      archetype: idx % 3 === 0 ? 'Dependable supporting specialist' : idx % 3 === 1 ? 'Rising prestige performer' : 'Commercial crowd-pleaser',
      narratives: idx % 3 === 0 ? ['Always works', 'Beloved by crews'] : idx % 3 === 1 ? ['Festival regular', 'Strong craft reputation'] : ['Reliable draw in the right genre'],
      quirks: idx % 2 === 0 ? ['Early call-time loyalist'] : ['Famous for improvisation'],
      reputation: 55 + (idx % 25),
      fame: 40 + (idx % 40),
    });
    idx += 1;
  }

  for (const [slug, name, gender, nationality, race] of padDirectors) {
    const genres = toGenre(idx);
    pad.push({
      slug,
      tier: 'notable',
      name,
      type: 'director',
      gender: gender as Gender,
      nationality,
      race: race as Race,
      birthYear: 1968 + (idx % 20),
      careerStartYear: 1996 + (idx % 20),
      genres,
      archetype: idx % 2 === 0 ? 'Genre specialist with studio trust' : 'Indie craftsman with strong voice',
      narratives: idx % 2 === 0 ? ['Dependable production manager'] : ['Distinctive style, smaller budgets'],
      quirks: idx % 2 === 0 ? ['Shoots fast'] : ['Endless takes'],
      reputation: 58 + (idx % 26),
    });
    idx += 1;
  }

  const all = [...expanded, ...pad];
  // Ensure unique slugs (defensive)
  const seen = new Set<string>();
  return all.filter((t) => {
    if (seen.has(t.slug)) return false;
    seen.add(t.slug);
    return true;
  });
}
