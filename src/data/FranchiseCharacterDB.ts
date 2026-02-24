// Franchise Character Database
// Global immutable definitions keyed by franchise ID when available, with fallback keys by parodySource/title.
// These are intentionally "parody" archetypes (not real IP names), but recognizable.

export interface FranchiseCharacterDef {
  character_id: string;
  name: string;
  role_template_id: string;
  traits?: string[];
  is_mandatory?: boolean;
  description?: string;
  importance: 'lead' | 'supporting' | 'minor' | 'crew';
  requiredType?: 'actor' | 'director';
  ageRange?: [number, number];
}

// Note: Franchise IDs are generated at runtime. Importer will try franchise.id,
// then franchise.parodySource, then curated RoleDatabase.
export const FRANCHISE_CHARACTER_DB: Record<string, FranchiseCharacterDef[]> = {
  // Sci-fi
  'Star Wars': [
    { character_id: 'char_hero_pilot', name: 'Hero Pilot', role_template_id: 'lead_hero', traits: ['brave', 'reckless', 'good-hearted'], is_mandatory: true, description: 'A wide-eyed pilot who keeps winning impossible odds.', importance: 'lead', requiredType: 'actor', ageRange: [18, 40] },
    { character_id: 'char_wise_mentor', name: 'Wise Mentor', role_template_id: 'mentor_mystic', traits: ['wise', 'cryptic', 'tragic'], is_mandatory: true, description: 'An aging mystic who teaches discipline, destiny, and selective truth.', importance: 'supporting', requiredType: 'actor', ageRange: [45, 85] },
    { character_id: 'char_rogue_smuggler', name: 'Rogue Smuggler', role_template_id: 'rogue_smuggler', traits: ['charming', 'selfish', 'secretly-loyal'], description: 'A sarcastic scoundrel with a fast ship and a faster exit plan.', importance: 'supporting', requiredType: 'actor', ageRange: [22, 55] },
    { character_id: 'char_princess_general', name: 'Princess-General', role_template_id: 'rebel_leader', traits: ['tough', 'strategic'], description: 'Royal by title, revolutionary by schedule.', importance: 'supporting', requiredType: 'actor', ageRange: [20, 60] },
    { character_id: 'char_masked_enforcer', name: 'Masked Enforcer', role_template_id: 'dark_enforcer', traits: ['intimidating', 'conflicted'], description: 'A towering enforcer in a dramatic helmet, powered by grievances.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 70] },
    { character_id: 'char_sassy_droid', name: 'Sassy Service Droid (Cameo)', role_template_id: 'comic_relief', traits: ['snarky', 'helpful'], description: 'A droid with feelings about the mission and everyone’s competency.', importance: 'minor', requiredType: 'actor', ageRange: [18, 80] },
    { character_id: 'char_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'Blade Runner': [
    { character_id: 'char_detective', name: 'Replicant Hunter', role_template_id: 'lead_detective', traits: ['stoic', 'jaded'], is_mandatory: true, description: 'A weary detective hired to do the kind of work that ruins sleep.', importance: 'lead', requiredType: 'actor', ageRange: [28, 60] },
    { character_id: 'char_runaway_synth', name: 'Runaway Synthetic', role_template_id: 'runaway_synth', traits: ['dreamer', 'dangerous', 'sympathetic'], description: 'A synthetic fugitive seeking a life that isn’t on a timer.', importance: 'supporting', requiredType: 'actor', ageRange: [18, 55] },
    { character_id: 'char_corp_heir', name: 'Corporate Heir', role_template_id: 'corp_heir', traits: ['entitled', 'ruthless'], description: 'Born into a megacorp and raised by security cameras.', importance: 'supporting', requiredType: 'actor', ageRange: [20, 55] },
    { character_id: 'char_noir_partner', name: 'Noir Partner (Cameo)', role_template_id: 'noir_partner', traits: ['loyal'], description: 'A partner who asks the wrong questions at the right time.', importance: 'minor', requiredType: 'actor', ageRange: [25, 70] },
    { character_id: 'char_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'Alien': [
    { character_id: 'alien_warrant_officer', name: 'Warrant Officer', role_template_id: 'space_survivor', traits: ['practical', 'unflappable'], is_mandatory: true, description: 'A blue-collar survivor who refuses to be a company memo.', importance: 'lead', requiredType: 'actor', ageRange: [25, 55] },
    { character_id: 'alien_ship_captain', name: 'Ship Captain', role_template_id: 'ship_captain', traits: ['authoritative', 'stressed'], description: 'A captain trying to keep payroll alive long enough to cash out.', importance: 'supporting', requiredType: 'actor', ageRange: [35, 70] },
    { character_id: 'alien_synthetic', name: 'Synthetic Crew Member', role_template_id: 'mysterious_android', traits: ['calm', 'secretive'], description: 'A polite synthetic with unsettling priorities.', importance: 'supporting', requiredType: 'actor', ageRange: [20, 60] },
    { character_id: 'alien_corp_handler', name: 'Corporate Handler', role_template_id: 'corp_handler', traits: ['smarmy', 'treacherous'], description: 'The person who keeps saying “protocol” while everyone is dying.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 65] },
    { character_id: 'alien_space_trucker', name: 'Space Trucker (Cameo)', role_template_id: 'space_trucker', traits: ['comic-relief'], description: 'A mechanic who just wants overtime, not existential terror.', importance: 'minor', requiredType: 'actor', ageRange: [18, 70] },
    { character_id: 'alien_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'Star Trek': [
    { character_id: 'trek_captain', name: 'Starship Captain', role_template_id: 'captain', traits: ['charismatic', 'reckless-ethical'], is_mandatory: true, description: 'A captain who solves problems with speeches and improbable maneuvers.', importance: 'lead', requiredType: 'actor', ageRange: [30, 65] },
    { character_id: 'trek_first_officer', name: 'Logical First Officer', role_template_id: 'first_officer', traits: ['logical', 'dry-humor'], description: 'A rational foil who still somehow gets dragged into chaos.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 65] },
    { character_id: 'trek_chief_engineer', name: 'Chief Engineer', role_template_id: 'engineer', traits: ['improviser', 'exasperated'], description: 'Keeps the ship running with duct tape and outrage.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 70] },
    { character_id: 'trek_alien_ambassador', name: 'Alien Ambassador', role_template_id: 'ambassador', traits: ['political', 'mysterious'], description: 'Diplomacy in a dramatic robe. Always has an agenda and a tea preference.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 80] },
    { character_id: 'trek_redshirt', name: 'Disposable Security Officer (Cameo)', role_template_id: 'redshirt', traits: ['brave'], description: 'A security officer with a suspicious lack of screen time.', importance: 'minor', requiredType: 'actor', ageRange: [18, 60] },
    { character_id: 'trek_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'The Matrix': [
    { character_id: 'matrix_hacker_chosen', name: 'Chosen Hacker', role_template_id: 'chosen_hacker', traits: ['confused', 'determined'], is_mandatory: true, description: 'A confused office worker who becomes a bug in reality’s codebase.', importance: 'lead', requiredType: 'actor', ageRange: [18, 45] },
    { character_id: 'matrix_mysterious_mentor', name: 'Mysterious Mentor', role_template_id: 'mysterious_mentor', traits: ['cool', 'cryptic'], description: 'A mentor who treats prophecy like a user manual.', importance: 'supporting', requiredType: 'actor', ageRange: [30, 70] },
    { character_id: 'matrix_leather_assassin', name: 'Leather-Clad Fighter', role_template_id: 'leather_fighter', traits: ['fearless', 'stylish'], description: 'A fighter who can bend spoons and the camera’s budget.', importance: 'supporting', requiredType: 'actor', ageRange: [18, 55] },
    { character_id: 'matrix_agent', name: 'Suit Agent', role_template_id: 'agent', traits: ['relentless'], description: 'A relentless suit who treats humans like spam.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 65] },
    { character_id: 'matrix_prophet', name: 'Kitchen Prophet (Cameo)', role_template_id: 'prophet', traits: ['warm', 'ominous'], description: 'A friendly prophet who casually ruins your worldview between cookies.', importance: 'minor', requiredType: 'actor', ageRange: [30, 90] },
    { character_id: 'matrix_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'Terminator': [
    { character_id: 'term_target', name: 'Future Target', role_template_id: 'future_target', traits: ['resourceful'], is_mandatory: true, description: 'A regular person with the audacity to matter in the timeline.', importance: 'lead', requiredType: 'actor', ageRange: [18, 50] },
    { character_id: 'term_protector', name: 'Future Protector', role_template_id: 'future_protector', traits: ['tough', 'driven'], description: 'A protector from the future with a very specific to-do list.', importance: 'supporting', requiredType: 'actor', ageRange: [20, 55] },
    { character_id: 'term_killer_machine', name: 'Killer Machine', role_template_id: 'killer_machine', traits: ['unstoppable'], description: 'A silent machine that treats doors as suggestions.', importance: 'supporting', requiredType: 'actor', ageRange: [20, 70] },
    { character_id: 'term_scientist', name: 'Doomsday Scientist (Cameo)', role_template_id: 'doomsday_scientist', traits: ['panicked'], description: 'A scientist who says “We can’t stop it” with alarming accuracy.', importance: 'minor', requiredType: 'actor', ageRange: [25, 75] },
    { character_id: 'term_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  // Fantasy
  'Lord of the Rings': [
    { character_id: 'lotr_ring_bearer', name: 'Ring-Bearer', role_template_id: 'ring_bearer', traits: ['stubborn', 'brave'], is_mandatory: true, description: 'A small hero tasked with carrying a world-ending problem.', importance: 'lead', requiredType: 'actor', ageRange: [18, 55] },
    { character_id: 'lotr_wizard', name: 'Wandering Wizard', role_template_id: 'mentor_mystic', traits: ['wise', 'dramatic'], description: 'A wizard who appears with advice and leaves with your sense of safety.', importance: 'supporting', requiredType: 'actor', ageRange: [40, 90] },
    { character_id: 'lotr_reluctant_king', name: 'Reluctant King', role_template_id: 'reluctant_king', traits: ['noble', 'brooding'], description: 'A warrior haunted by destiny and paperwork.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 65] },
    { character_id: 'lotr_dark_lord', name: 'Offscreen Dark Lord', role_template_id: 'dark_lord', traits: ['ancient'], description: 'An ancient menace represented by smoke, whispers, and HR violations.', importance: 'supporting', requiredType: 'actor', ageRange: [30, 90] },
    { character_id: 'lotr_innkeep', name: 'Suspicious Innkeeper (Cameo)', role_template_id: 'innkeep', traits: ['nosy'], description: 'Knows too much, says too little, charges too much.', importance: 'minor', requiredType: 'actor', ageRange: [25, 85] },
    { character_id: 'lotr_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'Harry Potter': [
    { character_id: 'hp_young_wizard', name: 'Accidental Wizard', role_template_id: 'young_wizard', traits: ['curious', 'stubborn'], is_mandatory: true, description: 'A student who keeps finding secret rooms instead of doing homework.', importance: 'lead', requiredType: 'actor', ageRange: [11, 19] },
    { character_id: 'hp_best_friend', name: 'Loyal Best Friend', role_template_id: 'best_friend', traits: ['loyal', 'anxious'], description: 'A best friend with snacks, panic, and unexpected bravery.', importance: 'supporting', requiredType: 'actor', ageRange: [11, 19] },
    { character_id: 'hp_genius_friend', name: 'Overprepared Genius', role_template_id: 'genius_friend', traits: ['brilliant', 'bossy'], description: 'Has already read the solution to this scene.', importance: 'supporting', requiredType: 'actor', ageRange: [11, 19] },
    { character_id: 'hp_headmaster', name: 'Eccentric Headmaster', role_template_id: 'mentor_mystic', traits: ['whimsical', 'calculating'], description: 'A headmaster whose plan always involves “trust me.”', importance: 'supporting', requiredType: 'actor', ageRange: [45, 90] },
    { character_id: 'hp_dark_wizard', name: 'Noseless Dark Wizard', role_template_id: 'dark_wizard', traits: ['vengeful'], description: 'A dark wizard who treats high school grudges as policy.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 80] },
    { character_id: 'hp_quidditch_announcer', name: 'Enchanted Sport Announcer (Cameo)', role_template_id: 'sport_announcer', traits: ['loud'], description: 'Screams about broom sports with sincere passion.', importance: 'minor', requiredType: 'actor', ageRange: [14, 70] },
    { character_id: 'hp_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'Game of Thrones': [
    { character_id: 'got_claimant', name: 'Throne Claimant', role_template_id: 'throne_claimant', traits: ['ambitious', 'ruthless'], is_mandatory: true, description: 'A claimant whose birthright is mostly paperwork and betrayal.', importance: 'lead', requiredType: 'actor', ageRange: [18, 65] },
    { character_id: 'got_hand', name: 'Cynical Advisor', role_template_id: 'advisor', traits: ['scheming', 'funny'], description: 'An advisor who survives by being useful and underestimated.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 80] },
    { character_id: 'got_warrior', name: 'Battle-Hardened Warrior', role_template_id: 'warrior', traits: ['tough'], description: 'A warrior who has seen too much and says so constantly.', importance: 'supporting', requiredType: 'actor', ageRange: [18, 70] },
    { character_id: 'got_dragon_rider', name: 'Dragon Rider', role_template_id: 'dragon_rider', traits: ['charismatic'], description: 'A ruler with dragons and the budget to prove it.', importance: 'supporting', requiredType: 'actor', ageRange: [18, 65] },
    { character_id: 'got_executioner', name: 'Public Executioner (Cameo)', role_template_id: 'executioner', traits: ['grim'], description: 'A cameo that reminds everyone the stakes are “literally.”', importance: 'minor', requiredType: 'actor', ageRange: [18, 70] },
    { character_id: 'got_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'The Witcher': [
    { character_id: 'witcher_hunter', name: 'Monster Contractor', role_template_id: 'monster_hunter', traits: ['grumpy', 'deadly'], is_mandatory: true, description: 'A monster-hunter who charges by the headache.', importance: 'lead', requiredType: 'actor', ageRange: [20, 65] },
    { character_id: 'witcher_sorceress', name: 'Chaotic Sorceress', role_template_id: 'sorceress', traits: ['brilliant', 'dangerous'], description: 'A sorceress with unstoppable ambition and a terrible dating life.', importance: 'supporting', requiredType: 'actor', ageRange: [20, 80] },
    { character_id: 'witcher_bard', name: 'Annoyingly Catchy Bard', role_template_id: 'bard', traits: ['charming', 'cowardly'], description: 'A bard who turns trauma into chart-topping tavern hits.', importance: 'supporting', requiredType: 'actor', ageRange: [18, 70] },
    { character_id: 'witcher_princess', name: 'Destined Orphan', role_template_id: 'destined_orphan', traits: ['stubborn'], description: 'A royal orphan with a destiny that refuses to stay vague.', importance: 'supporting', requiredType: 'actor', ageRange: [12, 30] },
    { character_id: 'witcher_tavern_keep', name: 'Tavern Keeper (Cameo)', role_template_id: 'innkeep', traits: ['judgmental'], description: 'Knows everyone’s secrets, charges extra for it.', importance: 'minor', requiredType: 'actor', ageRange: [18, 80] },
    { character_id: 'witcher_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  // Superhero
  'Marvel/DC Superhero Universe': [
    { character_id: 'mcu_team_leader', name: 'Inspiring Team Leader', role_template_id: 'team_leader', traits: ['leader'], is_mandatory: true, description: 'A leader with a code, a shield-like object, and a speech for every crisis.', importance: 'lead', requiredType: 'actor', ageRange: [22, 65] },
    { character_id: 'mcu_billionaire', name: 'Billionaire Genius', role_template_id: 'billionaire_genius', traits: ['cocky', 'brilliant'], description: 'A genius with gadgets, issues, and the loudest suit in the room.', importance: 'supporting', requiredType: 'actor', ageRange: [20, 70] },
    { character_id: 'mcu_demigod', name: 'Thunder Demigod', role_template_id: 'demigod', traits: ['arrogant', 'noble'], description: 'A thunder-wielding demigod with hair that has its own contract.', importance: 'supporting', requiredType: 'actor', ageRange: [20, 90] },
    { character_id: 'mcu_quippy_sidekick', name: 'Quippy Sidekick', role_template_id: 'quippy_sidekick', traits: ['funny'], description: 'Makes jokes to cope with cosmic doom (and to sell toys).', importance: 'supporting', requiredType: 'actor', ageRange: [16, 60] },
    { character_id: 'mcu_post_credit', name: 'Post-Credits Stranger (Cameo)', role_template_id: 'post_credits', traits: ['mysterious'], description: 'Appears for 8 seconds and launches 12 more movies.', importance: 'minor', requiredType: 'actor', ageRange: [18, 80] },
    { character_id: 'mcu_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'Batman': [
    { character_id: 'bat_dark_vigil', name: 'Brooding Vigilante', role_template_id: 'dark_knight', traits: ['brooding', 'brilliant'], is_mandatory: true, description: 'A masked detective powered by gadgets and unresolved feelings.', importance: 'lead', requiredType: 'actor', ageRange: [22, 65] },
    { character_id: 'bat_loyal_ally', name: 'Loyal Ally', role_template_id: 'loyal_ally', traits: ['wise'], description: 'An ally who keeps the vigilante alive and vaguely emotionally functional.', importance: 'supporting', requiredType: 'actor', ageRange: [30, 90] },
    { character_id: 'bat_cop_friend', name: 'Honest Cop', role_template_id: 'cop_friend', traits: ['stressed'], description: 'A rare honest cop drowning in corruption and weirdos.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 70] },
    { character_id: 'bat_clown', name: 'Clown Philosopher', role_template_id: 'clown_villain', traits: ['chaotic'], description: 'A villain who turns crime into performance art.', importance: 'supporting', requiredType: 'actor', ageRange: [20, 75] },
    { character_id: 'bat_newscaster', name: 'Gotham Newscaster (Cameo)', role_template_id: 'newscaster', traits: ['dramatic'], description: 'Reports on mayhem like it’s the weather.', importance: 'minor', requiredType: 'actor', ageRange: [18, 80] },
    { character_id: 'bat_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  // Horror
  'A Nightmare on Elm Street': [
    { character_id: 'elm_final_girl', name: 'Sleep-Deprived Survivor', role_template_id: 'final_girl', traits: ['resourceful'], is_mandatory: true, description: 'A survivor who treats caffeine as armor.', importance: 'lead', requiredType: 'actor', ageRange: [16, 40] },
    { character_id: 'elm_dream_killer', name: 'Dream-Stalker', role_template_id: 'slasher_icon', traits: ['sadistic', 'punny'], description: 'A supernatural killer who treats nightmares like open mic night.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 80] },
    { character_id: 'elm_parent', name: 'Guilty Parent', role_template_id: 'guilty_parent', traits: ['secretive'], description: 'Knows the truth, hides it poorly.', importance: 'supporting', requiredType: 'actor', ageRange: [30, 70] },
    { character_id: 'elm_doctor', name: 'Sleep Doctor (Cameo)', role_template_id: 'sleep_doctor', traits: ['skeptical'], description: 'Says it’s “stress” moments before the ceiling attacks.', importance: 'minor', requiredType: 'actor', ageRange: [25, 75] },
    { character_id: 'elm_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'Halloween': [
    { character_id: 'hall_final_girl', name: 'Final Survivor', role_template_id: 'final_girl', traits: ['resourceful'], is_mandatory: true, description: 'A survivor with instincts sharper than the soundtrack.', importance: 'lead', requiredType: 'actor', ageRange: [16, 45] },
    { character_id: 'hall_silent_shape', name: 'Silent Shape', role_template_id: 'slasher_icon', traits: ['unstoppable'], description: 'A masked figure who walks slowly and still arrives first.', importance: 'supporting', requiredType: 'actor', ageRange: [20, 80] },
    { character_id: 'hall_sheriff', name: 'Overwhelmed Sheriff', role_template_id: 'sheriff', traits: ['tired'], description: 'Tries to do their job in a town allergic to safety.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 75] },
    { character_id: 'hall_babysitter', name: 'Babysitter (Cameo)', role_template_id: 'babysitter', traits: ['unlucky'], description: 'A cameo that has too many keys to the house.', importance: 'minor', requiredType: 'actor', ageRange: [16, 35] },
    { character_id: 'hall_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'Friday the 13th': [
    { character_id: 'fri_final_girl', name: 'Camp Survivor', role_template_id: 'final_girl', traits: ['resourceful'], is_mandatory: true, description: 'A counselor who learns “buddy system” too late.', importance: 'lead', requiredType: 'actor', ageRange: [16, 45] },
    { character_id: 'fri_lake_killer', name: 'Lake Legend Killer', role_template_id: 'slasher_icon', traits: ['brutal'], description: 'An urban legend with a practical approach to sequels.', importance: 'supporting', requiredType: 'actor', ageRange: [20, 80] },
    { character_id: 'fri_camp_owner', name: 'Camp Owner', role_template_id: 'camp_owner', traits: ['cheap'], description: 'Reopens the camp despite all evidence and basic math.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 80] },
    { character_id: 'fri_cop', name: 'Local Cop (Cameo)', role_template_id: 'cop', traits: ['skeptical'], description: 'Shows up after everything is over.', importance: 'minor', requiredType: 'actor', ageRange: [20, 70] },
    { character_id: 'fri_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  // Action/Adventure
  'Fast & Furious': [
    { character_id: 'ff_road_hero', name: 'Road-Rule Outlaw', role_template_id: 'street_racer', traits: ['loyal', 'reckless'], is_mandatory: true, description: 'An outlaw driver whose true fuel is found family.', importance: 'lead', requiredType: 'actor', ageRange: [20, 60] },
    { character_id: 'ff_rival_ally', name: 'Rival-Turned-Ally', role_template_id: 'rival_ally', traits: ['competitive'], description: 'Starts as an enemy, ends as family, repeats every movie.', importance: 'supporting', requiredType: 'actor', ageRange: [20, 60] },
    { character_id: 'ff_techie', name: 'Garage Tech Genius', role_template_id: 'tech', traits: ['smart', 'quirky'], description: 'Builds impossible gadgets in a garage with no permits.', importance: 'supporting', requiredType: 'actor', ageRange: [18, 50] },
    { character_id: 'ff_muscle', name: 'Muscle With a Heart', role_template_id: 'muscle', traits: ['tough'], description: 'Punches problems first, hugs them later.', importance: 'supporting', requiredType: 'actor', ageRange: [20, 60] },
    { character_id: 'ff_barista', name: 'Street-Race Barista (Cameo)', role_template_id: 'barista', traits: ['snarky'], description: 'Serves espresso and passive-aggressive advice.', importance: 'minor', requiredType: 'actor', ageRange: [18, 60] },
    { character_id: 'ff_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'Mission: Impossible': [
    { character_id: 'mi_field_agent', name: 'Field Agent', role_template_id: 'spy_lead', traits: ['fearless'], is_mandatory: true, description: 'A field agent who treats gravity as negotiable.', importance: 'lead', requiredType: 'actor', ageRange: [25, 65] },
    { character_id: 'mi_hacker', name: 'Hacker Operative', role_template_id: 'tech_op', traits: ['clever'], description: 'Breaks encryption and complains about it.', importance: 'supporting', requiredType: 'actor', ageRange: [18, 55] },
    { character_id: 'mi_handler', name: 'Agency Handler', role_template_id: 'handler', traits: ['paranoid'], description: 'Says “This will self-destruct” like it’s a greeting.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 70] },
    { character_id: 'mi_mastermind', name: 'Elusive Mastermind', role_template_id: 'antagonist', traits: ['cold'], description: 'Always two steps ahead and one monologue too long.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 75] },
    { character_id: 'mi_news', name: 'News Anchor (Cameo)', role_template_id: 'newscaster', traits: ['dramatic'], description: 'Reports global chaos with perfect hair.', importance: 'minor', requiredType: 'actor', ageRange: [18, 80] },
    { character_id: 'mi_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'James Bond': [
    { character_id: 'bond_super_spy', name: 'Tuxedo Super-Spy', role_template_id: 'spy_lead', traits: ['charming', 'reckless'], is_mandatory: true, description: 'A spy who saves the world between martinis and property damage.', importance: 'lead', requiredType: 'actor', ageRange: [25, 70] },
    { character_id: 'bond_quartermaster', name: 'Gadget Quartermaster', role_template_id: 'quartermaster', traits: ['grumpy'], description: 'Builds gadgets and judges your life choices.', importance: 'supporting', requiredType: 'actor', ageRange: [30, 85] },
    { character_id: 'bond_boss', name: 'Agency Boss', role_template_id: 'agency_boss', traits: ['stern'], description: 'Wants results, not excuses (gets excuses anyway).', importance: 'supporting', requiredType: 'actor', ageRange: [35, 85] },
    { character_id: 'bond_villain', name: 'Lair Villain', role_template_id: 'megalomaniac', traits: ['megalomaniac'], description: 'Owns a lair, a plan, and a monologue budget.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 85] },
    { character_id: 'bond_bartender', name: 'Bartender (Cameo)', role_template_id: 'bartender', traits: ['unimpressed'], description: 'Serves drinks and disdain.', importance: 'minor', requiredType: 'actor', ageRange: [18, 80] },
    { character_id: 'bond_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'Indiana Jones': [
    { character_id: 'indy_prof', name: 'Daredevil Professor', role_template_id: 'adventure_prof', traits: ['brave', 'impulsive'], is_mandatory: true, description: 'An academic who solves tenure with whips and curses.', importance: 'lead', requiredType: 'actor', ageRange: [25, 75] },
    { character_id: 'indy_sidekick', name: 'Skeptical Sidekick', role_template_id: 'sidekick', traits: ['loyal'], description: 'Helps carry artifacts and doubts.', importance: 'supporting', requiredType: 'actor', ageRange: [18, 70] },
    { character_id: 'indy_rival', name: 'Rival Collector', role_template_id: 'rival_collector', traits: ['greedy'], description: 'Wants the relic for profit, not history.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 80] },
    { character_id: 'indy_cursed_guardian', name: 'Cursed Guardian', role_template_id: 'cursed_guardian', traits: ['ancient'], description: 'Protects the relic with supernatural consequences.', importance: 'supporting', requiredType: 'actor', ageRange: [20, 90] },
    { character_id: 'indy_museum', name: 'Museum Curator (Cameo)', role_template_id: 'curator', traits: ['panicked'], description: 'Watches priceless items get destroyed in 4K.', importance: 'minor', requiredType: 'actor', ageRange: [25, 85] },
    { character_id: 'indy_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'Pirates of the Caribbean': [
    { character_id: 'pirate_captain', name: 'Unreliable Pirate Captain', role_template_id: 'pirate_captain', traits: ['eccentric', 'lucky'], is_mandatory: true, description: 'A charming disaster with a compass that hates him.', importance: 'lead', requiredType: 'actor', ageRange: [20, 75] },
    { character_id: 'pirate_straight', name: 'Straight-Laced Sailor', role_template_id: 'straight_sailor', traits: ['honorable'], description: 'The only person trying to have a plot.', importance: 'supporting', requiredType: 'actor', ageRange: [18, 65] },
    { character_id: 'pirate_cursed', name: 'Cursed Buccaneer', role_template_id: 'cursed_buccaneer', traits: ['spooky'], description: 'Cursed, cranky, and strangely fashionable.', importance: 'supporting', requiredType: 'actor', ageRange: [20, 85] },
    { character_id: 'pirate_navy', name: 'Navy Pursuer', role_template_id: 'navy_pursuer', traits: ['stubborn'], description: 'Chases pirates like it’s a hobby (it is).', importance: 'supporting', requiredType: 'actor', ageRange: [20, 75] },
    { character_id: 'pirate_parrot', name: 'Parrot Handler (Cameo)', role_template_id: 'parrot_handler', traits: ['weird'], description: 'Shows up with a parrot that has better comedic timing than the leads.', importance: 'minor', requiredType: 'actor', ageRange: [18, 80] },
    { character_id: 'pirate_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  // Monster / spectacle
  'Jurassic Park': [
    { character_id: 'jp_scientist', name: 'Panic Scientist', role_template_id: 'scientist', traits: ['smart', 'terrified'], is_mandatory: true, description: 'A scientist who keeps saying “this was a bad idea.”', importance: 'lead', requiredType: 'actor', ageRange: [22, 70] },
    { character_id: 'jp_ceo', name: 'Theme Park Visionary', role_template_id: 'park_ceo', traits: ['optimistic', 'reckless'], description: 'Swears they spared no expense, proves otherwise immediately.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 85] },
    { character_id: 'jp_ranger', name: 'Ranger', role_template_id: 'ranger', traits: ['brave'], description: 'Knows the park better than the engineers who built it.', importance: 'supporting', requiredType: 'actor', ageRange: [18, 70] },
    { character_id: 'jp_kid', name: 'Unlucky Kid', role_template_id: 'kid', traits: ['curious'], description: 'Finds trouble faster than the dinosaurs find fences.', importance: 'supporting', requiredType: 'actor', ageRange: [8, 18] },
    { character_id: 'jp_lawyer', name: 'Insurance Lawyer (Cameo)', role_template_id: 'lawyer', traits: ['cowardly'], description: 'A cameo that exists solely to regret everything.', importance: 'minor', requiredType: 'actor', ageRange: [25, 75] },
    { character_id: 'jp_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'Transformers': [
    { character_id: 'tf_human_lead', name: 'Human Sidekick', role_template_id: 'human_sidekick', traits: ['panicked'], is_mandatory: true, description: 'A normal human stuck in an interstellar toy commercial.', importance: 'lead', requiredType: 'actor', ageRange: [16, 40] },
    { character_id: 'tf_noble_bot', name: 'Noble Robot Leader', role_template_id: 'noble_robot', traits: ['heroic'], description: 'A heroic robot with a voice that could sell morality itself.', importance: 'supporting', requiredType: 'actor', ageRange: [18, 90] },
    { character_id: 'tf_rogue_bot', name: 'Rogue Robot', role_template_id: 'rogue_robot', traits: ['funny'], description: 'A rogue robot who treats war like banter.', importance: 'supporting', requiredType: 'actor', ageRange: [18, 90] },
    { character_id: 'tf_villain_bot', name: 'Tyrant Robot Warlord', role_template_id: 'tyrant_robot', traits: ['ruthless'], description: 'A warlord who turns every city into collateral damage.', importance: 'supporting', requiredType: 'actor', ageRange: [18, 90] },
    { character_id: 'tf_agent', name: 'Government Agent (Cameo)', role_template_id: 'government_agent', traits: ['paranoid'], description: 'Has exactly one line: “We didn’t know.”', importance: 'minor', requiredType: 'actor', ageRange: [20, 70] },
    { character_id: 'tf_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  // YA / romance
  'The Hunger Games': [
    { character_id: 'hg_rebel', name: 'Reluctant Rebel', role_template_id: 'rebel_lead', traits: ['defiant'], is_mandatory: true, description: 'A reluctant hero drafted into a public spectacle.', importance: 'lead', requiredType: 'actor', ageRange: [14, 30] },
    { character_id: 'hg_mentor', name: 'Disillusioned Mentor', role_template_id: 'mentor', traits: ['cynical'], description: 'A mentor with survival tips and a drinking problem.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 80] },
    { character_id: 'hg_stylist', name: 'Overzealous Stylist', role_template_id: 'stylist', traits: ['dramatic'], description: 'Turns war into fashion and insists it’s “iconic.”', importance: 'supporting', requiredType: 'actor', ageRange: [18, 80] },
    { character_id: 'hg_antagonist', name: 'Smiling Hostile Official', role_template_id: 'official', traits: ['cruel'], description: 'Runs the spectacle with a grin and a ledger.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 80] },
    { character_id: 'hg_interviewer', name: 'Interviewer (Cameo)', role_template_id: 'interviewer', traits: ['nosy'], description: 'Asks invasive questions in glitter.', importance: 'minor', requiredType: 'actor', ageRange: [18, 80] },
    { character_id: 'hg_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'Twilight': [
    { character_id: 'tw_new_kid', name: 'New Kid in Town', role_template_id: 'teen_lead', traits: ['awkward'], is_mandatory: true, description: 'Moves to a rainy town and immediately becomes a plot magnet.', importance: 'lead', requiredType: 'actor', ageRange: [14, 25] },
    { character_id: 'tw_vampire', name: 'Moody Vampire', role_template_id: 'vampire_love', traits: ['brooding'], description: 'An immortal vampire who acts like a dramatic sophomore.', importance: 'supporting', requiredType: 'actor', ageRange: [14, 120] },
    { character_id: 'tw_wolf', name: 'Protective Werewolf', role_template_id: 'werewolf_love', traits: ['hot-headed'], description: 'A werewolf who declares feelings like it’s a land dispute.', importance: 'supporting', requiredType: 'actor', ageRange: [14, 60] },
    { character_id: 'tw_parent', name: 'Confused Parent', role_template_id: 'parent', traits: ['clueless'], description: 'A parent who doesn’t notice any of this.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 70] },
    { character_id: 'tw_friend', name: 'Gossip Friend (Cameo)', role_template_id: 'gossip_friend', traits: ['nosy'], description: 'Exists to ask “so, are you dating?” at the worst time.', importance: 'minor', requiredType: 'actor', ageRange: [14, 30] },
    { character_id: 'tw_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  // Comedy / crime
  'American Pie': [
    { character_id: 'ap_awkward_lead', name: 'Awkward Teen', role_template_id: 'awkward_teen', traits: ['awkward'], is_mandatory: true, description: 'A teen who should not be allowed to make plans.', importance: 'lead', requiredType: 'actor', ageRange: [16, 25] },
    { character_id: 'ap_best_friend', name: 'Best Friend', role_template_id: 'best_friend', traits: ['supportive'], description: 'Encourages bad ideas with good intentions.', importance: 'supporting', requiredType: 'actor', ageRange: [16, 25] },
    { character_id: 'ap_cool_kid', name: 'Cool Kid', role_template_id: 'cool_kid', traits: ['confident'], description: 'Confident, loud, and wrong about everything.', importance: 'supporting', requiredType: 'actor', ageRange: [16, 25] },
    { character_id: 'ap_parent', name: 'Oversharing Parent (Cameo)', role_template_id: 'parent', traits: ['oversharing'], description: 'Delivers advice no one asked for.', importance: 'minor', requiredType: 'actor', ageRange: [30, 80] },
    { character_id: 'ap_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],

  'The Godfather': [
    { character_id: 'gf_don', name: 'The Don', role_template_id: 'patriarch', traits: ['calm', 'threatening'], is_mandatory: true, description: 'A calm patriarch who makes offers like chess moves.', importance: 'lead', requiredType: 'actor', ageRange: [45, 90] },
    { character_id: 'gf_heir', name: 'Reluctant Heir', role_template_id: 'heir', traits: ['conflicted'], description: 'A reluctant heir learning the cost of power.', importance: 'supporting', requiredType: 'actor', ageRange: [25, 60] },
    { character_id: 'gf_advisor', name: 'Family Advisor', role_template_id: 'advisor', traits: ['loyal'], description: 'A trusted advisor who quietly fixes disasters.', importance: 'supporting', requiredType: 'actor', ageRange: [30, 80] },
    { character_id: 'gf_rival', name: 'Rival Boss', role_template_id: 'rival', traits: ['aggressive'], description: 'A rival boss with ambition and bad manners.', importance: 'supporting', requiredType: 'actor', ageRange: [30, 85] },
    { character_id: 'gf_waiter', name: 'Restaurant Waiter (Cameo)', role_template_id: 'waiter', traits: ['nervous'], description: 'A cameo caught in the wrong conversation.', importance: 'minor', requiredType: 'actor', ageRange: [18, 70] },
    { character_id: 'gf_director', name: 'Director', role_template_id: 'director', importance: 'crew', requiredType: 'director', is_mandatory: true },
  ],
};
