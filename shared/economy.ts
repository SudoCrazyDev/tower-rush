/** Every tunable number that isn't tied to a single unit, monster or arena. */
export interface Economy {
  // battle
  startMana: number;
  lives: number;
  summonCostStart: number;
  summonCostStep: number;
  waveManaBase: number;
  waveManaPerWave: number;
  powerUpCosts: number[];
  powerUpBonus: number;
  rankDamageStep: number;
  rankSpeedStep: number;
  // awakening (a unit merged to max rank with awakened art)
  /** Highest merge rank; reaching it awakens a unit. Each rank doubles the summons needed. */
  maxRank: number;
  awakenDamageMult: number;
  awakenSpeedMult: number;
  ultimateCooldown: number;
  ultimateDamageMult: number;
  ultimateRadius: number;
  // waves
  waveHpBase: number;
  waveHpGrowth: number;
  arenaHpStep: number;
  waveSizeBase: number;
  waveSizePerWave: number;
  waveSizeMax: number;
  spawnIntervalStart: number;
  spawnIntervalStep: number;
  spawnIntervalMin: number;
  bossEvery: number;
  bossHpMult: number;
  // cards
  levelBonus: number;
  upgradeCopies: number[];
  upgradeCoins: number[];
  rarityCopyDiscount: number;
  rarityCoinMarkup: number;
  // rewards
  coinsPerWave: number;
  arenaCoinBonus: number;
  coinsPerBoss: number;
  gemsPerBoss: number;
  trophiesPerWave: number;
  trophyOffset: number;
  trophyMaxLoss: number;
  // new players
  startingCoins: number;
  startingGems: number;
  starterDeck: string[];
  starterCards: string[];
  // daily quests (the quests themselves and the login calendar are separate config lists)
  questsPerDay: number;
  questBonusCoins: number;
  questBonusGems: number;
  // free gift
  giftCoins: number;
  giftGems: number;
  giftCooldownHours: number;
  // shop
  /** Most chests of one kind a player can buy and open in a single purchase. */
  chestBulkMax: number;
}

export const DEFAULT_ECONOMY: Economy = {
  startMana: 100,
  lives: 3,
  summonCostStart: 10,
  summonCostStep: 10,
  waveManaBase: 20,
  waveManaPerWave: 8,
  powerUpCosts: [100, 200, 400, 700, 1000],
  powerUpBonus: 0.15,
  rankDamageStep: 1,
  rankSpeedStep: 0.08,
  maxRank: 7,
  awakenDamageMult: 1.5,
  awakenSpeedMult: 1.2,
  ultimateCooldown: 10,
  ultimateDamageMult: 4,
  ultimateRadius: 170,

  waveHpBase: 90,
  waveHpGrowth: 1.19,
  arenaHpStep: 0.12,
  waveSizeBase: 9,
  waveSizePerWave: 1.4,
  waveSizeMax: 36,
  spawnIntervalStart: 1.05,
  spawnIntervalStep: 0.025,
  spawnIntervalMin: 0.42,
  bossEvery: 5,
  bossHpMult: 45,

  levelBonus: 0.08,
  upgradeCopies: [2, 4, 10, 20, 50, 100, 200, 400, 800, 1000, 2000, 3000, 4000, 5000],
  upgradeCoins: [20, 50, 150, 400, 1000, 2000, 4000, 8000, 15000, 25000, 40000, 60000, 80000, 100000],
  rarityCopyDiscount: 1.5,
  rarityCoinMarkup: 0.5,

  coinsPerWave: 12,
  arenaCoinBonus: 0.15,
  coinsPerBoss: 60,
  gemsPerBoss: 5,
  trophiesPerWave: 3,
  trophyOffset: 18,
  trophyMaxLoss: 15,

  startingCoins: 300,
  startingGems: 120,
  starterDeck: ["hooded_archer", "goblin_bomber", "penguin_wizard", "tesla_gnome", "flame_adept"],
  starterCards: ["hooded_archer", "goblin_bomber", "penguin_wizard", "tesla_gnome", "flame_adept", "fox_spearman", "cactus_gunslinger", "clockwork_turret"],

  questsPerDay: 3,
  questBonusCoins: 0,
  questBonusGems: 20,

  giftCoins: 50,
  giftGems: 10,
  giftCooldownHours: 4,

  chestBulkMax: 10,
};

export const ECONOMY: Economy = structuredClone(DEFAULT_ECONOMY);

export interface ChestDef {
  id: string;
  name: string;
  /** Art key in items/ (chest_common, chest_rare, chest_epic, chest_legendary). */
  image: string;
  price: number;
  currency: "coins" | "gems";
  rolls: number;
  coinsMin: number;
  coinsMax: number;
  /** Minimum rarity guaranteed in the first roll. */
  guarantee: "common" | "rare" | "epic" | "legendary" | "mythic";
  enabled: boolean;
}

export const DEFAULT_CHESTS: ChestDef[] = [
  { id: "wooden", name: "Wooden Chest", image: "chest_common", price: 150, currency: "coins", rolls: 4, coinsMin: 40, coinsMax: 90, guarantee: "common", enabled: true },
  { id: "silver", name: "Silver Chest", image: "chest_rare", price: 60, currency: "gems", rolls: 7, coinsMin: 100, coinsMax: 200, guarantee: "rare", enabled: true },
  { id: "royal", name: "Royal Chest", image: "chest_epic", price: 180, currency: "gems", rolls: 12, coinsMin: 250, coinsMax: 450, guarantee: "epic", enabled: true },
  { id: "mythic", name: "Mythic Chest", image: "chest_legendary", price: 450, currency: "gems", rolls: 20, coinsMin: 600, coinsMax: 1000, guarantee: "legendary", enabled: true },
];

export const CHESTS: ChestDef[] = structuredClone(DEFAULT_CHESTS);

/** Rewards for a finished run, computed by the server and shown by the client. */
export function battleRewards(wave: number, bossesKilled: number, arenaIndex: number) {
  const e = ECONOMY;
  return {
    coins: Math.round(wave * e.coinsPerWave * (1 + arenaIndex * e.arenaCoinBonus) + bossesKilled * e.coinsPerBoss),
    gems: bossesKilled * e.gemsPerBoss,
    trophies: Math.max(-e.trophyMaxLoss, wave * e.trophiesPerWave - e.trophyOffset),
  };
}
