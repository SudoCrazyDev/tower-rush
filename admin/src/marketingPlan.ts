/**
 * The 9-week social plan that spends the remaining Higgsfield credits (468.55 on 2026-10-14).
 * One piece of content a day, cut once and posted to TikTok, FB Reels, X, the FB feed and Discord.
 * Paid days: one still (GPT Image 2.5 medium, 0.5) animated into two 4s Seedance 1.5 Pro 720p clips
 * (2.4 each as charged, silent) for an 8s looping reel. Prices from the 2026-10-14 run. Free days: gameplay recordings.
 */

export const CREDITS_LEFT = 468.55;
export const STILL_COST = 0.5;
export const CLIP_COST = 2.4;
/** Credits for one paid day: a still and two clips. */
export const PAID_DAY_COST = STILL_COST + 2 * CLIP_COST;
/** Monday of week 1. */
export const PLAN_START = "2026-10-19";
export const CTA = "Play free at crownnkeep.com";

export type Theme = "awaken" | "boss" | "gameplay" | "story" | "pvp" | "social" | "recap";

export const THEMES: Record<Theme, { label: string; paid: boolean }> = {
  awaken: { label: "Awakening spotlight", paid: true },
  boss: { label: "Boss reveal", paid: true },
  gameplay: { label: "Gameplay clip", paid: false },
  story: { label: "Story & lore", paid: true },
  pvp: { label: "PvP challenge", paid: true },
  social: { label: "Meme / poll", paid: true },
  recap: { label: "Recap / teaser", paid: false },
};

export type PlanDay = {
  theme: Theme;
  title: string;
  /** On-screen text for the first 2 seconds. */
  hook: string;
  /** Paid days: the still prompt. Free days: what to record. */
  still: string;
  /** Paid days: the two Seedance beats, each animated from the still. */
  clips: string[];
  caption: string;
  /** Discord conversation starter. */
  question: string;
};

export type PlanWeek = { phase: string; focus: string; days: PlanDay[] };

const STYLE =
  "Flat 2D vector cartoon game art matching the Crown & Keep style reference, thick dark navy outlines, simple two-tone cel shading, chunky rounded proportions, bright saturated colors, vertical 9:16 poster composition, top 20% left clear for text, no text, no watermark";

const awaken = (unit: string, ult: string, hook: string, beats: [string, string, string], caption: string, question: string): PlanDay => ({
  theme: "awaken",
  title: `${unit}: ${ult}`,
  hook,
  still: `${unit} in their awakened form, mid-cast of ${ult}, on a castle wall at dusk. ${STYLE}.`,
  clips: beats.slice(1).map((b) => `${beats[0]} ${b} Slow push-in.`),
  caption,
  question,
});

const boss = (name: string, hook: string, scene: string, caption: string, question: string): PlanDay => ({
  theme: "boss",
  title: `Boss: ${name}`,
  hook,
  still: `${name}, ${scene}, towering over a tiny defended keep, low camera angle. ${STYLE}.`,
  clips: [
    `${name} steps forward, the ground cracks and towers shake.`,
    `Close-up roar at the camera, then cut to black.`,
  ],
  caption,
  question,
});

const story = (chapter: string, hook: string, scene: string, caption: string, question: string): PlanDay => ({
  theme: "story",
  title: `Story: ${chapter}`,
  hook,
  still: `Storybook panel of ${scene}. ${STYLE}.`,
  clips: [
    `The panel comes alive: ${scene}. Gentle parallax.`,
    `Camera pulls back to reveal the keep and the road ahead.`,
  ],
  caption,
  question,
});

const pvp = (title: string, hook: string, scene: string, caption: string, question: string): PlanDay => ({
  theme: "pvp",
  title: `PvP: ${title}`,
  hook,
  still: `Split-screen duel: two rival keeps facing each other, ${scene}. ${STYLE}.`,
  clips: [
    `Waves of monsters cross the middle; spells clash.`,
    `One keep's crown topples; VICTORY banner unfurls.`,
  ],
  caption,
  question,
});

const social = (title: string, hook: string, scene: string, caption: string, question: string): PlanDay => ({
  theme: "social",
  title,
  hook,
  still: `${scene}. ${STYLE}, playful tone.`,
  clips: [
    `The twist lands, characters react comically.`,
    `Camera pushes in on the punchline moment with a small comic shake.`,
  ],
  caption,
  question,
});

const gameplay = (title: string, hook: string, record: string, caption: string, question: string): PlanDay => ({
  theme: "gameplay",
  title: `Gameplay: ${title}`,
  hook,
  still: `Record 15-20s of the game (portrait, phone or 9:16 crop): ${record}`,
  clips: [],
  caption,
  question,
});

const recap = (title: string, hook: string, record: string, caption: string, question: string): PlanDay => ({
  theme: "recap",
  title,
  hook,
  still: `Record or cut together (no credits): ${record}`,
  clips: [],
  caption,
  question,
});

export const PLAN: PlanWeek[] = [
  {
    phase: "The Great Awakening",
    focus: "Launch push for v2.7: legendary awakenings and their ultimates.",
    days: [
      awaken("Chrono Mage", "Big Ben", "This mage stops the clock.", ["A giant clock tower rises behind the Chrono Mage.", "The bell tolls; a golden shockwave rolls over the field.", "Monsters freeze mid-step as the clock hands race."], "The Chrono Mage awakens. When Big Ben tolls, every tower ranks up. The Great Awakening is live.", "Which unit should get the next awakening spotlight?"),
      boss("Ashmaw, the Dragon Mother", "She was asleep. Was.", "wings spread over a burning valley", "Ashmaw, the Dragon Mother, does not come alone. Can your keep hold?", "What's your best deck against Ashmaw?"),
      gameplay("Big Ben on a full board", "Watch every tower rank up at once.", "a crowded late wave, Chrono Mage's Big Ben going off and the board ranking up.", "Big Ben going off on a full board. Pure chaos.", "Post your highest-wave clip!"),
      story("The Beginning", "Every keep starts with one tower.", "a lone young hero raising the first tower on an empty hill", "Book 1: The Chosen. Where every crown begins.", "Who was the first unit you ever maxed?"),
      pvp("Hold the line", "Can you out-defend a real player?", "one guarded by awakened legendaries", "Real players. Same waves. One crown. PvP is waiting.", "What's your PvP win streak?"),
      social("Tier list: new awakenings", "Rank the 5 new legendary awakenings.", "five awakened legendaries lined up on tiered stone steps, S to C", "Black Hole, Big Ben, Queen's Gambit, Star Merger, Frozen Fields. Rank them.", "Drop your tier list. Who's S tier?"),
      recap("Week 1 recap", "One week of The Great Awakening.", "the best clips of the week plus the v2.7 patch notes screen.", "Week 1 of The Great Awakening in 15 seconds.", "What should we show next week?"),
    ],
  },
  {
    phase: "The Great Awakening",
    focus: "Keep the v2.7 momentum: showcase the flashiest ultimates.",
    days: [
      awaken("Vampire Countess", "Queen's Gambit", "Every monster arrives already bitten.", ["The Countess raises a goblet; red mist spills over the field.", "Monsters walking in glow with a crimson kiss mark.", "They fall and burst into mana coins flowing to her keep."], "Queen's Gambit: every monster walks in already kissed. Every kill pays.", "Countess: mana engine or overrated?"),
      boss("The Chaos-Iron Colossus", "It's not a boss. It's four.", "built from Legs, Cannons, Furnace and Anvil-Heart", "The Chaos-Iron Colossus. Break the Legs, the Cannons, the Furnace, then the Heart.", "Which Colossus part do you kill first?"),
      gameplay("Black Hole", "One spell. Whole wave gone.", "Void Titan's Black Hole pulling a full wave into the center.", "Void Titan's Black Hole eats a whole wave.", "Best combo to pair with Black Hole?"),
      story("The Candy Gates", "The sweetest war you'll ever fight.", "candy-cane gates guarded by gummy soldiers", "Saving the Muse begins at the Candy Gates.", "Favorite story so far?"),
      pvp("Frozen Fields", "Freeze them. Then finish them.", "one side frozen solid by the Crystal Queen", "Crystal Queen's Frozen Fields can turn a PvP match in a second.", "Hardest PvP counter you've faced?"),
      social("Bomberman Mode", "When the Goblin Bomber hears 'go wild'.", "the Goblin Bomber grinning with an armful of lit bombs", "Goblin Bomber awakened is exactly as safe as it sounds.", "Most chaotic unit in the game?"),
      recap("Week 2 recap", "Your best moments this week.", "community clips and screenshots from Discord (ask permission first).", "Your keeps, your clips. Week 2 recap.", "Want to be featured next week? Post your clip!"),
    ],
  },
  {
    phase: "The roster",
    focus: "Evergreen content: units, bosses and the PvP ladder.",
    days: [
      awaken("Void Titan", "Black Hole", "It doesn't attack. It deletes.", ["The Void Titan raises a fist; stars dim.", "A black hole opens and the sky bends toward it.", "Monsters spiral in and vanish with a flash."], "Void Titan's Black Hole. Gravity is the strongest tower.", "Void Titan or Chrono Mage?"),
      boss("Kraken", "Something's under your keep.", "tentacles wrapped around a lighthouse", "The Kraken rises in Sand & Sea. Bring cannons.", "Pirate Gunner or Tide Mermaid against the Kraken?"),
      gameplay("Star Merger", "Two stars become one.", "Star Astronomer's Star Merger combining towers mid-wave.", "Star Merger in action. Two towers, one star.", "Best Star Merger target?"),
      story("Chaorruption", "The candy kingdom turned violet.", "a sweet kingdom corrupted by creeping violet chaos", "Chaorruption: when the sweets turn sour.", "Which Chaos Corrupted boss gave you the most trouble?"),
      pvp("Best opening deck", "Your first 4 cards decide the match.", "two decks of four glowing cards hovering over each keep", "Show us your PvP opener. We'll show ours.", "What 4 cards do you open with?"),
      social("Main race poll", "Pick your side.", "banners of every race lined up at a crossroads", "Every keep has a favorite. Which race is yours?", "Poll: which race do you main?"),
      recap("Week 3 recap", "Three weeks in.", "top waves and the PvP leaderboard top 3.", "The leaderboard is heating up. Week 3 recap.", "Who's taking #1 this week?"),
    ],
  },
  {
    phase: "The roster",
    focus: "Evergreen content: units, bosses and the PvP ladder.",
    days: [
      awaken("Sun Priestess", "Retribution", "Hit her keep. Regret it.", ["The Sun Priestess kneels in a ring of light.", "Monsters strike the wall; golden runes flare.", "A beam of sunlight returns the damage tenfold."], "Sun Priestess's Retribution punishes every hit on your keep.", "Defense or offense: how do you build?"),
      boss("Lich King", "He's been waiting.", "on a throne of ice and bone", "The Lich King doesn't fall easily. Do you have the deck for it?", "Best fire unit against the Lich King?"),
      gameplay("Tidal Wave", "Clear the lane in one wave.", "Tide Mermaid's Tidal Wave washing a lane clean.", "Tide Mermaid's Tidal Wave clearing a lane.", "Clip your best lane clear!"),
      story("The Drowned Coast", "The tide brought something back.", "a drowned harbor with a ghost ship on the horizon", "Sand & Sea: The Drowned Coast.", "Ocean chapters or desert chapters?"),
      pvp("The comeback", "Down to one heart. Not done.", "one keep cracked and burning but still fighting", "PvP comebacks are real. Never surrender.", "Best comeback you've pulled off?"),
      social("Shield Knight's day off", "Shield Knight takes one day off.", "the Shield Knight napping while the keep panics", "Never give the Shield Knight a day off.", "Most underrated unit?"),
      recap("Week 4 recap", "Halfway there.", "community highlights plus a quick tip of the week.", "Week 4 recap and a tip for the climb.", "What tip would you give a new player?"),
    ],
  },
  {
    phase: "The roster",
    focus: "Evergreen content: units, bosses and the PvP ladder.",
    days: [
      awaken("Star Astronomer", "Star Merger", "She rearranges the sky.", ["The Star Astronomer turns a brass telescope skyward.", "Two falling stars collide above the keep.", "The merged star lands as a radiant tower."], "Star Astronomer's Star Merger: two towers become one star.", "What do you merge first?"),
      boss("High Justiciar Argent", "Court is in session.", "in a grand tribunal flanked by The Prosecutor and The Bailiff", "High Justiciar Argent passes judgment. Will your keep be found guilty?", "Argent: hardest boss in the game?"),
      gameplay("Shadow Clones", "Which one is real?", "Shadow Ninja's Shadow Clones filling the board.", "Shadow Ninja's clones everywhere.", "Shadow Ninja: top tier or trap?"),
      story("Thalmyr, the Torn Guardian", "The guardian has turned.", "a giant elven guardian torn between light and chaos", "Thalmyr, the Torn Guardian. Can he be saved?", "Theories on Thalmyr?"),
      pvp("League climb", "Bronze to Legend. How far can you go?", "a stone ladder of league banners rising into the clouds", "The PvP leagues are open. How high can you climb?", "What league are you in?"),
      social("Fan art call", "Draw your favorite unit.", "an artist's desk covered in sketches of game units", "Draw your favorite unit. We'll feature the best ones.", "Post your fan art in #fan-art!"),
      recap("Week 5 recap", "Fan art week.", "the best fan art submissions (with credit and permission).", "Your art, our heroes. Week 5 recap.", "Which piece was your favorite?"),
    ],
  },
  {
    phase: "Deep cuts",
    focus: "Bring back older content and invite deck-building challenges.",
    days: [
      awaken("Crystal Queen", "Frozen Fields", "Every step is her territory.", ["The Crystal Queen taps her staff; frost spreads.", "The whole field turns to glittering ice.", "Monsters slow to a crawl and shatter."], "Crystal Queen's Frozen Fields freeze the whole board.", "Frozen Fields or Black Hole?"),
      boss("The Faceless Herald", "It has no face. It has your fear.", "a robed figure with a blank mask in a ruined chapel", "The Faceless Herald. Hope your keep isn't easily scared.", "Creepiest boss in the game?"),
      gameplay("Reborn", "It doesn't stay dead.", "Phoenix Chick's Reborn bringing it back mid-wave.", "Phoenix Chick refuses to stay down.", "Funniest unit in the game?"),
      story("Ondrath, the Sleeping Isle", "That island is breathing.", "a vast island that is the back of a sleeping titan", "Ondrath, the Sleeping Isle. Don't wake it.", "Which boss fight is the most epic?"),
      pvp("Commons only", "4 commons. 1 win.", "two keeps defended only by humble common units", "Challenge: win a PvP match with only commons. Post proof.", "Did you pull off a commons-only win?"),
      social("Deck challenge", "Build a deck with no legendaries.", "a deck of cards with the legendary slot crossed out", "No legendaries. How far can you get?", "Share your no-legendary deck!"),
      recap("Week 6 recap", "Challenge winners.", "the best commons-only wins and decks from the community.", "Commons can win. Here's proof. Week 6 recap.", "What challenge should we do next?"),
    ],
  },
  {
    phase: "Next update",
    focus: "Start building hype for the next release; tease without spoiling.",
    days: [
      awaken("Fox Samurai", "Blade Dance", "Every strike is a crit.", ["The Fox Samurai draws a blade under falling leaves.", "A blur of slashes cuts across the field.", "Monsters fall in sequence as the blade sheathes."], "Fox Samurai's Blade Dance: crits on every strike, guaranteed on bosses.", "Fox Samurai or Shadow Ninja?"),
      boss("Demon Lord", "The gate is open.", "stepping out of a burning portal", "The Demon Lord is coming. Is your keep ready?", "Toughest boss you've beaten?"),
      gameplay("Ultimate chain", "Five ultimates. One second.", "several awakened ultimates firing back to back.", "Five ultimates in one second. Beautiful chaos.", "What's your favorite ultimate combo?"),
      story("Summit of Vaeltharion", "The elven commander waits at the top.", "an elven commander on a windswept mountain summit", "Summit of Vaeltharion: the climb ends here.", "Who's your favorite villain?"),
      pvp("Season finale", "Last week of the season.", "two champion keeps in a colosseum under fireworks", "The PvP season is almost over. Last chance to climb.", "Where will you finish this season?"),
      social("Guess the silhouette", "Who's this? Wrong answers only.", "a dark silhouette of a mystery unit against a glowing gate", "New face coming soon. Guess who.", "Guesses? Wrong answers only."),
      recap("Week 7 teaser", "Something's coming.", "a dark teaser cut of the menu with the new update's logo blurred.", "Something is coming to Crown & Keep.", "What do you want in the next update?"),
    ],
  },
  {
    phase: "Next update",
    focus: "Teaser drip: one new reveal per week, keep core content flowing.",
    days: [
      awaken("Thunder Dwarf", "Grace of Mjolnir", "One hammer. All the thunder.", ["The Thunder Dwarf spins a glowing hammer overhead.", "Lightning forks from the sky into the hammer.", "He slams it down; chain lightning arcs through the wave."], "Thunder Dwarf's Grace of Mjolnir. Bring the storm.", "Thunder Dwarf: still good?"),
      boss("Void Emperor", "The end of the map.", "seated on a throne floating in empty space", "The Void Emperor rules the end of the map.", "Have you reached the Void Emperor?"),
      gameplay("Speed run", "Fastest clear you've ever seen.", "a fast clear of an early chapter at max speed.", "Speed run. Beat this time.", "Post your fastest clear!"),
      story("The Muse's Palace", "The Muse is waiting.", "a glittering palace of spun sugar at the end of the road", "Saving the Muse ends at the Muse's Palace.", "Which story should get a sequel?"),
      pvp("New season", "A new season. A clean slate.", "fresh league banners being raised over two keeps", "A new PvP season starts now. Everyone back to the start.", "What's your goal this season?"),
      social("Teaser 2: a new silhouette", "Another one.", "a second mystery silhouette beside the first, under a storm sky", "Another face joins soon.", "Who do you think it is?"),
      recap("Week 8 teaser", "Almost here.", "a short teaser cut with the release date blurred.", "Almost here.", "Hype level, 1 to 10?"),
    ],
  },
  {
    phase: "Next update",
    focus: "Release week: big reveal on the buffer credits, then thank the community.",
    days: [
      awaken("Bone Necromancer", "Raise Dead", "Your losses fight back.", ["The Bone Necromancer raises a staff over a field of bones.", "Fallen monsters rise as skeleton allies.", "The skeleton army marches toward the next wave."], "Bone Necromancer's Raise Dead: the fallen fight for you.", "Necromancer: best support unit?"),
      boss("Fire Dragon", "Hope you brought water.", "circling a volcano spewing lava", "The Fire Dragon. Fireproof your keep.", "Tide Mermaid or Frost Sorceress against fire?"),
      gameplay("Full awakened deck", "Every unit awakened.", "a run with a fully awakened deck at a late wave.", "A fully awakened deck at work.", "How many awakened units do you have?"),
      story("The next chapter", "The story continues.", "the open book turning to a blank page that starts to fill with ink", "A new chapter is coming to Crown & Keep.", "Where should the story go next?"),
      pvp("Champions", "Meet this season's top keeps.", "the top three players' banners on a podium", "Congrats to this season's PvP champions.", "Who's dethroning them next season?"),
      social("Reveal day", "It's here.", "the two mystery silhouettes stepping into the light", "The wait is over. Update out now.", "First impressions?"),
      recap("Thank you", "Thank you, keepers.", "a montage of the best clips of the past 9 weeks.", "Nine weeks of keeps, crowns and chaos. Thank you.", "What was your favorite moment?"),
    ],
  },
];

const HASHTAGS = {
  tiktok: "#crownandkeep #towerdefense #mobilegames #indiegame #gaming",
  reels: "#crownandkeep #towerdefense #indiegame #mobilegame",
  x: "#CrownAndKeep #indiegame",
};

/** Copy for each platform, built from the day's hook, caption and question. */
export function platformCopy(d: PlanDay) {
  return {
    "TikTok": `${d.hook} ${d.caption} ${CTA} ${HASHTAGS.tiktok}`,
    "FB Reels": `${d.hook} ${d.caption} ${CTA} ${HASHTAGS.reels}`,
    "X": `${d.caption} ${CTA} ${HASHTAGS.x}`,
    "FB feed": `${d.hook}\n\n${d.caption}\n\n${d.question}\n\n${CTA}`,
    "Discord": `**${d.title}**\n${d.caption}\n\n${d.question}`,
  };
}

/** The date (YYYY-MM-DD) of a plan day; week and day are 0-based. */
export function planDate(week: number, day: number) {
  const t = new Date(`${PLAN_START}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + week * 7 + day);
  return t.toISOString().slice(0, 10);
}

export const weekCost = (w: PlanWeek) => Math.round(w.days.filter((d) => THEMES[d.theme].paid).length * PAID_DAY_COST * 100) / 100;
