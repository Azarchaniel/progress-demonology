import Decimal from "break_infinity.js";

export type UpgradeKind =
  | "speed"
  | "cost"
  | "essence"
  | "knowledge"
  | "power"
  | "demonPower"
  | "slavicPower"
  | "follower"
  | "automation";
export interface UnitDefinition {
  id: string;
  name: string;
  tier: number;
  description: string;
  baseCost: Decimal;
  summonTime: number;
  power: Decimal;
  essencePerSecond: Decimal;
  unlockKnowledge: Decimal;
  region?: "slavic";
  knowledgePerSecond?: number;
}
export interface UpgradeDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  cost: Decimal;
  knowledge: number;
  requires?: string | string[];
  kind: UpgradeKind;
  factor: number;
  targets?: string[];
  repeatable?: boolean;
  region?: "slavic";
}
export type RegionId = "ancient" | "slavic";
export interface CityDefinition {
  region: RegionId;
  id: string;
  name: string;
  epithet: string;
  description: string;
  strength: Decimal;
  reward: number;
}
export interface KnowledgeSource {
  id: string;
  title: string;
  description: string;
  requirement: number;
  value: number;
}
export interface ConquestRecord {
  cityName: string;
  armyLost: string;
  dominionGained: string;
  at: number;
}
export interface GameState {
  version: string;
  essence: Decimal;
  knowledge: Decimal;
  knowledgeSpent: Decimal;
  dominion: Decimal;
  units: Record<string, Decimal>;
  progress: Record<string, number>;
  active: Record<string, boolean>;
  summonOrder: string[];
  cult: {
    followers: Decimal;
    fanatics: Decimal;
    progress: number;
    awakened: boolean;
  };
  knowledgeSource: string | null;
  knowledgeProgress: number;
  automationPaused: Record<string, boolean>;
  upgrades: Record<string, boolean>;
  upgradeLevels: Record<string, number>;
  conquest: { victories: number; last: ConquestRecord | null };
  campaign: { cityIndex: number };
  runTime: number;
  simulationSpeed: number;
  debugUnlock: boolean;
  lastSave: number;
}
