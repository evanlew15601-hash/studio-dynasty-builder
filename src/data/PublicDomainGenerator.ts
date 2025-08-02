// Public Domain IP Generation System
import { PublicDomainIP, Genre, ScriptCharacter } from '@/types/game';

interface PublicDomainTemplate {
  name: string;
  domainType: PublicDomainIP['domainType'];
  dateEnteredDomain: string;
  coreElements: string[];
  genreFlexibility: Genre[];
  reputationScore: number;
  description: string;
  suggestedCharacters: Partial<ScriptCharacter>[];
}

const PUBLIC_DOMAIN_TEMPLATES: PublicDomainTemplate[] = [
  // Literature
  {
    name: 'Pride and Prejudice',
    domainType: 'literature',
    dateEnteredDomain: '1900-01-01',
    coreElements: ['Elizabeth Bennet', 'Mr. Darcy', 'Social class', 'Marriage', 'Misunderstandings'],
    genreFlexibility: ['drama', 'romance', 'comedy'],
    reputationScore: 95,
    description: 'Jane Austen\'s beloved novel about love, class, and social expectations',
    suggestedCharacters: [
      { name: 'Elizabeth Bennet', roleType: 'lead', description: 'Independent-minded young woman' },
      { name: 'Mr. Darcy', roleType: 'lead', description: 'Proud but noble gentleman' }
    ]
  },
  {
    name: 'Sherlock Holmes',
    domainType: 'literature',
    dateEnteredDomain: '1927-01-01',
    coreElements: ['Sherlock Holmes', 'Dr. Watson', 'Detective work', '221B Baker Street', 'Deduction'],
    genreFlexibility: ['mystery', 'crime', 'thriller', 'adventure'],
    reputationScore: 98,
    description: 'Arthur Conan Doyle\'s master detective and his loyal companion',
    suggestedCharacters: [
      { name: 'Sherlock Holmes', roleType: 'lead', description: 'Brilliant consulting detective' },
      { name: 'Dr. Watson', roleType: 'supporting', description: 'Loyal friend and chronicler' }
    ]
  },
  {
    name: 'Dracula',
    domainType: 'literature',
    dateEnteredDomain: '1928-01-01',
    coreElements: ['Count Dracula', 'Van Helsing', 'Vampirism', 'Transylvania', 'Gothic horror'],
    genreFlexibility: ['horror', 'thriller', 'romance', 'action'],
    reputationScore: 92,
    description: 'Bram Stoker\'s iconic vampire novel',
    suggestedCharacters: [
      { name: 'Count Dracula', roleType: 'lead', description: 'Ancient vampire lord' },
      { name: 'Van Helsing', roleType: 'supporting', description: 'Vampire hunter and scholar' }
    ]
  },
  {
    name: 'The Strange Case of Dr. Jekyll and Mr. Hyde',
    domainType: 'literature',
    dateEnteredDomain: '1912-01-01',
    coreElements: ['Dr. Jekyll', 'Mr. Hyde', 'Dual nature', 'Scientific experiment', 'Good vs evil'],
    genreFlexibility: ['horror', 'thriller', 'drama', 'sci-fi'],
    reputationScore: 88,
    description: 'Robert Louis Stevenson\'s tale of man\'s dual nature',
    suggestedCharacters: [
      { name: 'Dr. Jekyll/Mr. Hyde', roleType: 'lead', description: 'Scientist with dark alter ego' }
    ]
  },
  {
    name: 'Alice\'s Adventures in Wonderland',
    domainType: 'literature',
    dateEnteredDomain: '1907-01-01',
    coreElements: ['Alice', 'Mad Hatter', 'Cheshire Cat', 'Queen of Hearts', 'Wonderland'],
    genreFlexibility: ['fantasy', 'family', 'adventure', 'comedy'],
    reputationScore: 94,
    description: 'Lewis Carroll\'s whimsical journey through a magical world',
    suggestedCharacters: [
      { name: 'Alice', roleType: 'lead', description: 'Curious young girl exploring Wonderland' },
      { name: 'Mad Hatter', roleType: 'supporting', description: 'Eccentric tea party host' }
    ]
  },

  // Mythology - Greek
  {
    name: 'The Odyssey',
    domainType: 'mythology',
    dateEnteredDomain: 'ancient',
    coreElements: ['Odysseus', 'Epic journey', 'Greek gods', 'Penelope', 'Trojan War'],
    genreFlexibility: ['adventure', 'fantasy', 'drama', 'action'],
    reputationScore: 96,
    description: 'Homer\'s epic poem of Odysseus\'s journey home',
    suggestedCharacters: [
      { name: 'Odysseus', roleType: 'lead', description: 'Cunning Greek hero returning from war' },
      { name: 'Penelope', roleType: 'supporting', description: 'Faithful wife waiting for his return' }
    ]
  },
  {
    name: 'Perseus and Medusa',
    domainType: 'mythology',
    dateEnteredDomain: 'ancient',
    coreElements: ['Perseus', 'Medusa', 'Gorgon', 'Divine intervention', 'Hero\'s quest'],
    genreFlexibility: ['fantasy', 'action', 'adventure'],
    reputationScore: 82,
    description: 'The hero\'s quest to slay the monstrous Medusa',
    suggestedCharacters: [
      { name: 'Perseus', roleType: 'lead', description: 'Young hero on divine quest' },
      { name: 'Medusa', roleType: 'supporting', description: 'Cursed gorgon with deadly gaze' }
    ]
  },
  {
    name: 'Pandora\'s Box',
    domainType: 'mythology',
    dateEnteredDomain: 'ancient',
    coreElements: ['Pandora', 'Forbidden knowledge', 'Hope', 'Consequences', 'Divine punishment'],
    genreFlexibility: ['fantasy', 'drama', 'horror', 'thriller'],
    reputationScore: 85,
    description: 'The first woman and the box that unleashed evil upon the world',
    suggestedCharacters: [
      { name: 'Pandora', roleType: 'lead', description: 'First woman created by the gods' }
    ]
  },

  // Mythology - Norse
  {
    name: 'Ragnarök',
    domainType: 'mythology',
    dateEnteredDomain: 'ancient',
    coreElements: ['End of the world', 'Norse gods', 'Odin', 'Thor', 'Final battle'],
    genreFlexibility: ['fantasy', 'action', 'drama'],
    reputationScore: 78,
    description: 'The prophesied end of the Norse gods and the world',
    suggestedCharacters: [
      { name: 'Odin', roleType: 'lead', description: 'All-father of the Norse gods' },
      { name: 'Thor', roleType: 'supporting', description: 'God of thunder and protector of mankind' }
    ]
  },

  // Folklore
  {
    name: 'Robin Hood',
    domainType: 'folklore',
    dateEnteredDomain: '1500-01-01',
    coreElements: ['Robin Hood', 'Merry Men', 'Sheriff of Nottingham', 'Sherwood Forest', 'Social justice'],
    genreFlexibility: ['adventure', 'action', 'drama', 'comedy'],
    reputationScore: 90,
    description: 'The legendary outlaw who robbed from the rich to give to the poor',
    suggestedCharacters: [
      { name: 'Robin Hood', roleType: 'lead', description: 'Noble outlaw fighting injustice' },
      { name: 'Maid Marian', roleType: 'supporting', description: 'Robin\'s beloved and ally' }
    ]
  },
  {
    name: 'King Arthur and the Knights of the Round Table',
    domainType: 'folklore',
    dateEnteredDomain: '1485-01-01',
    coreElements: ['King Arthur', 'Excalibur', 'Camelot', 'Knights of the Round Table', 'Merlin'],
    genreFlexibility: ['fantasy', 'adventure', 'drama', 'romance'],
    reputationScore: 93,
    description: 'The legendary British king and his noble knights',
    suggestedCharacters: [
      { name: 'King Arthur', roleType: 'lead', description: 'Legendary king of Camelot' },
      { name: 'Merlin', roleType: 'supporting', description: 'Wise wizard and Arthur\'s advisor' }
    ]
  },

  // Historical
  {
    name: 'Joan of Arc',
    domainType: 'historical',
    dateEnteredDomain: '1456-01-01',
    coreElements: ['Joan of Arc', 'Divine visions', 'French resistance', 'Trial and martyrdom', 'Peasant girl'],
    genreFlexibility: ['drama', 'historical', 'war', 'biography'],
    reputationScore: 87,
    description: 'The peasant girl who led France against the English',
    suggestedCharacters: [
      { name: 'Joan of Arc', roleType: 'lead', description: 'Divinely inspired peasant warrior' }
    ]
  },
  {
    name: 'Cleopatra',
    domainType: 'historical',
    dateEnteredDomain: '30-08-12',
    coreElements: ['Cleopatra VII', 'Ancient Egypt', 'Political intrigue', 'Julius Caesar', 'Mark Antony'],
    genreFlexibility: ['drama', 'historical', 'romance', 'biography'],
    reputationScore: 91,
    description: 'The last pharaoh of Egypt and her legendary romances',
    suggestedCharacters: [
      { name: 'Cleopatra', roleType: 'lead', description: 'Last pharaoh of Egypt' },
      { name: 'Julius Caesar', roleType: 'supporting', description: 'Roman general and politician' }
    ]
  },

  // Religious
  {
    name: 'Noah\'s Ark',
    domainType: 'religious',
    dateEnteredDomain: 'ancient',
    coreElements: ['Noah', 'Great flood', 'Divine command', 'Animals', 'Survival'],
    genreFlexibility: ['drama', 'adventure', 'family', 'fantasy'],
    reputationScore: 86,
    description: 'The biblical story of Noah and the great flood',
    suggestedCharacters: [
      { name: 'Noah', roleType: 'lead', description: 'Righteous man chosen to save creation' }
    ]
  },
  {
    name: 'David and Goliath',
    domainType: 'religious',
    dateEnteredDomain: 'ancient',
    coreElements: ['David', 'Goliath', 'Underdog victory', 'Faith', 'Courage'],
    genreFlexibility: ['drama', 'action', 'family', 'biography'],
    reputationScore: 84,
    description: 'The young shepherd who defeated the giant Philistine warrior',
    suggestedCharacters: [
      { name: 'David', roleType: 'lead', description: 'Young shepherd with great faith' },
      { name: 'Goliath', roleType: 'supporting', description: 'Giant Philistine warrior' }
    ]
  }
];

export class PublicDomainGenerator {
  static generateInitialPublicDomainIPs(count: number = 50): PublicDomainIP[] {
    const publicDomainIPs: PublicDomainIP[] = [];
    
    // Use all templates first
    for (let i = 0; i < Math.min(count, PUBLIC_DOMAIN_TEMPLATES.length); i++) {
      const template = PUBLIC_DOMAIN_TEMPLATES[i];
      
      const publicDomainIP: PublicDomainIP = {
        id: `PD${String(i + 1).padStart(3, '0')}`,
        name: template.name,
        domainType: template.domainType,
        dateEnteredDomain: template.dateEnteredDomain,
        coreElements: template.coreElements,
        genreFlexibility: template.genreFlexibility,
        notableAdaptations: [],
        reputationScore: template.reputationScore,
        adaptationFatigue: 0,
        culturalRelevance: this.calculateInitialCulturalRelevance(template.reputationScore),
        requiredElements: template.coreElements.slice(0, Math.min(3, template.coreElements.length)),
        description: this.generateDescription(template.name, template.domainType),
        cost: 0, // Public domain is always free
        suggestedCharacters: template.suggestedCharacters.map((char, index) => ({
          id: `${template.name.replace(/\s+/g, '')}_${index}`,
          name: char.name || 'Character',
          roleType: char.roleType || 'supporting',
          screenTimeMinutes: char.roleType === 'lead' ? 90 : 30,
          description: char.description || 'Character from source material',
          ageRange: [25, 45] as [number, number],
          requiredTraits: []
        }))
      };
      
      publicDomainIPs.push(publicDomainIP);
    }
    
    // Generate additional entries if needed
    const remainingCount = count - publicDomainIPs.length;
    if (remainingCount > 0) {
      const additionalIPs = this.generateAdditionalPublicDomainIPs(remainingCount, publicDomainIPs.length);
      publicDomainIPs.push(...additionalIPs);
    }
    
    return publicDomainIPs;
  }
  
  static generateAdditionalPublicDomainIPs(count: number, startIndex: number): PublicDomainIP[] {
    const additionalTemplates = [
      'Beowulf', 'The Canterbury Tales', 'Don Quixote', 'Gulliver\'s Travels',
      'The Three Musketeers', 'The Count of Monte Cristo', 'Les Misérables',
      'Moby Dick', 'Treasure Island', 'The Jungle Book', 'Peter Pan',
      'The Wizard of Oz', 'A Christmas Carol', 'Frankenstein', 'The Time Machine',
      'The War of the Worlds', 'Twenty Thousand Leagues Under the Sea',
      'Around the World in Eighty Days', 'The Picture of Dorian Gray'
    ];
    
    const domainTypes: PublicDomainIP['domainType'][] = ['literature', 'folklore', 'mythology'];
    const genres: Genre[][] = [
      ['adventure', 'fantasy'],
      ['drama', 'romance'],
      ['horror', 'thriller'],
      ['comedy', 'family'],
      ['mystery', 'crime']
    ];
    
    const additionalIPs: PublicDomainIP[] = [];
    
    for (let i = 0; i < count; i++) {
      const templateIndex = i % additionalTemplates.length;
      const name = additionalTemplates[templateIndex];
      const domainType = domainTypes[Math.floor(Math.random() * domainTypes.length)];
      const genreSet = genres[Math.floor(Math.random() * genres.length)];
      
      const publicDomainIP: PublicDomainIP = {
        id: `PD${String(startIndex + i + 1).padStart(3, '0')}`,
        name,
        domainType,
        dateEnteredDomain: this.generateRandomHistoricalDate(),
        coreElements: this.generateCoreElements(name),
        genreFlexibility: genreSet,
        notableAdaptations: [],
        reputationScore: Math.floor(Math.random() * 30) + 60, // 60-90
        adaptationFatigue: 0,
        description: this.generateDescription(name, domainType),
        cost: 0, // Public domain is always free
        culturalRelevance: Math.floor(Math.random() * 40) + 50, // 50-90
        requiredElements: [],
        suggestedCharacters: []
      };
      
      additionalIPs.push(publicDomainIP);
    }
    
    return additionalIPs;
  }
  
  static generateRandomHistoricalDate(): string {
    const year = Math.floor(Math.random() * 400) + 1600; // 1600-2000
    return `${year}-01-01`;
  }
  
  static generateCoreElements(name: string): string[] {
    const genericElements = [
      'Classic characters', 'Timeless themes', 'Cultural significance',
      'Historical context', 'Literary merit', 'Universal appeal'
    ];
    
    // Pick 3-5 random elements
    const count = Math.floor(Math.random() * 3) + 3;
    const selected: string[] = [];
    
    for (let i = 0; i < count; i++) {
      const available = genericElements.filter(el => !selected.includes(el));
      if (available.length > 0) {
        selected.push(available[Math.floor(Math.random() * available.length)]);
      }
    }
    
    return selected;
  }
  
  static calculateInitialCulturalRelevance(reputationScore: number): number {
    // Base cultural relevance on reputation but add some variation
    return Math.min(100, reputationScore + Math.floor(Math.random() * 20 - 10));
  }

  static generateDescription(name: string, domainType: string): string {
    // Use template description if available
    const template = PUBLIC_DOMAIN_TEMPLATES.find(t => t.name === name);
    if (template?.description) {
      return template.description;
    }

    // Generate generic description based on domain type
    const domainDescriptions = {
      literature: `A classic work of literature that has influenced countless generations of readers and storytellers.`,
      mythology: `An ancient mythological tale rich with symbolic meaning and timeless themes.`,
      folklore: `A beloved folk tale passed down through generations, embodying cultural values and universal truths.`,
      historical: `A significant historical figure or event that continues to fascinate and inspire.`,
      religious: `A sacred story that has provided guidance and meaning to believers throughout history.`
    };

    return domainDescriptions[domainType] || 'A significant cultural work available in the public domain.';
  }
  
  static canAdapt(publicDomainIP: PublicDomainIP, currentDate: string): boolean {
    // Check adaptation fatigue
    if (publicDomainIP.adaptationFatigue && publicDomainIP.adaptationFatigue > 75) {
      return false;
    }
    
    // Check if there was a recent adaptation
    if (publicDomainIP.lastAdaptationDate) {
      const lastYear = parseInt(publicDomainIP.lastAdaptationDate.split('-')[0]);
      const currentYear = parseInt(currentDate.split('-')[0]);
      
      // Need at least 1 year gap for major IPs, less for minor ones
      const minGap = publicDomainIP.reputationScore > 85 ? 2 : 1;
      return currentYear - lastYear >= minGap;
    }
    
    return true;
  }
  
  static updateAdaptationMetrics(
    publicDomainIP: PublicDomainIP, 
    adaptationResult: { rating: number; boxOffice: number; adaptationType: string }
  ): PublicDomainIP {
    let newFatigue = publicDomainIP.adaptationFatigue || 0;
    let newRelevance = publicDomainIP.culturalRelevance || publicDomainIP.reputationScore;
    
    // Update fatigue based on adaptation quality and type
    if (adaptationResult.rating < 50) {
      newFatigue = Math.min(100, newFatigue + 25); // Bad adaptations hurt
    } else if (adaptationResult.rating > 80) {
      newFatigue = Math.max(0, newFatigue - 10); // Great adaptations reduce fatigue
      newRelevance = Math.min(100, newRelevance + 5); // And boost relevance
    } else {
      newFatigue = Math.min(100, newFatigue + 10); // Mediocre adaptations still add fatigue
    }
    
    // Faithful adaptations add less fatigue than reimaginings
    if (adaptationResult.adaptationType === 'faithful') {
      newFatigue = Math.max(0, newFatigue - 5);
    }
    
    return {
      ...publicDomainIP,
      adaptationFatigue: newFatigue,
      culturalRelevance: newRelevance,
      lastAdaptationDate: new Date().toISOString().split('T')[0],
      notableAdaptations: [...publicDomainIP.notableAdaptations]
    };
  }
  
  static getAdaptationBonus(publicDomainIP: PublicDomainIP, adaptationType: string): number {
    let bonus = publicDomainIP.reputationScore / 10; // Base bonus from reputation
    
    // Bonus for cultural relevance
    bonus += (publicDomainIP.culturalRelevance || 50) / 20;
    
    // Penalty for adaptation fatigue
    bonus -= (publicDomainIP.adaptationFatigue || 0) / 10;
    
    // Adaptation type modifiers
    switch (adaptationType) {
      case 'faithful':
        bonus += 2; // Critics like faithful adaptations
        break;
      case 'modern':
        bonus += 1; // Modern updates can attract new audiences
        break;
      case 'reimagined':
        bonus += 3; // Bold reimaginings can be critically acclaimed
        break;
      case 'parody':
        bonus -= 1; // Parodies are less critically respected
        break;
    }
    
    return Math.max(0, bonus);
  }
}