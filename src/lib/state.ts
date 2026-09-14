import Decimal from "break_infinity.js";
import {
  units,
  upgrades,
  cities,
  VERSION,
  rules,
  cultRules,
  knowledgeSources,
  regions,
} from "./content";
import type { GameState } from "./types";

export const SAVE_KEY = "progress-demonology-save";
export let loadNotice = "";
export function createInitialState(): GameState {
  return {
    version: VERSION,
    essence: new Decimal(rules.initialEssence),
    knowledge: new Decimal(0),
    knowledgeSpent: new Decimal(0),
    dominion: new Decimal(0),
    units: Object.fromEntries(units.map((u) => [u.id, new Decimal(0)])),
    progress: Object.fromEntries(units.map((u) => [u.id, 0])),
    active: {},
    automationPaused: {},
    upgrades: {},
    upgradeLevels: {},
    summonOrder: [],
    cult: {
      followers: new Decimal(0),
      fanatics: new Decimal(0),
      progress: 0,
      awakened: false,
    },
    knowledgeSource: null,
    knowledgeProgress: 0,
    conquest: { victories: 0, last: null },
    campaign: { cityIndex: 0 },
    runTime: 0,
    simulationSpeed: 1,
    debugUnlock: false,
    lastSave: 0,
  };
}
function amount(value: unknown, fallback = 0): Decimal {
  if (typeof value !== "string" && typeof value !== "number")
    return new Decimal(fallback);
  if (
    typeof value === "string" &&
    !/^[+]?\d*\.?\d+(?:e[+-]?\d+)?$/i.test(value)
  )
    return new Decimal(fallback);
  try {
    const n = new Decimal(value);
    return Number.isFinite(n.mantissa) &&
      Number.isFinite(n.exponent) &&
      n.gte(0)
      ? n
      : new Decimal(fallback);
  } catch {
    return new Decimal(fallback);
  }
}
const finite = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
export function serializeState(
  state: GameState,
  timestamp = Date.now(),
): string {
  return JSON.stringify({
    ...state,
    lastSave: timestamp,
    essence: state.essence.toString(),
    knowledge: state.knowledge.toString(),
    knowledgeSpent: state.knowledgeSpent.toString(),
    dominion: state.dominion.toString(),
    cult: {
      ...state.cult,
      followers: state.cult.followers.toString(),
      fanatics: state.cult.fanatics.toString(),
    },
    units: Object.fromEntries(
      units.map((u) => [u.id, state.units[u.id].toString()]),
    ),
  });
}
export function deserializeState(json: string): GameState {
  const raw = JSON.parse(json);
  if (!raw || typeof raw !== "object" || raw.version !== VERSION)
    throw new Error("Unrecognized save version");
  const state = createInitialState();
  state.essence = amount(raw.essence, rules.initialEssence);
  state.knowledge = amount(raw.knowledge);
  state.knowledgeSpent = amount(raw.knowledgeSpent);
  state.dominion = amount(raw.dominion);
  for (const unit of units) {
    state.units[unit.id] = amount(raw.units?.[unit.id]).floor();
    state.active[unit.id] = raw.active?.[unit.id] === true;
    state.progress[unit.id] = state.active[unit.id]
      ? Math.min(finite(raw.progress?.[unit.id]), unit.summonTime)
      : 0;
    state.automationPaused[unit.id] = raw.automationPaused?.[unit.id] === true;
  }
  for (const u of upgrades)
    state.upgrades[u.id] = raw.upgrades?.[u.id] === true;
  const order = Array.isArray(raw.summonOrder)
    ? raw.summonOrder.filter(
        (id: unknown) =>
          typeof id === "string" &&
          units.some((u) => u.id === id) &&
          state.active[id],
      )
    : [];
  state.summonOrder = [
    ...new Set<string>([
      ...order,
      ...units.filter((u) => state.active[u.id]).map((u) => u.id),
    ]),
  ];
  state.cult = {
    followers: amount(raw.cult?.followers).floor(),
    fanatics: amount(raw.cult?.fanatics).floor(),
    progress: Math.min(finite(raw.cult?.progress), cultRules.followerInterval),
    awakened:
      raw.cult?.awakened === true || units.some((u) => state.units[u.id].gt(0)),
  };
  state.knowledgeSource = knowledgeSources.some(
    (source) =>
      source.id === raw.knowledgeSource &&
      discoveredKnowledge(state).gte(source.requirement),
  )
    ? raw.knowledgeSource
    : null;
  state.runTime = finite(raw.runTime);
  state.lastSave = finite(raw.lastSave);
  state.simulationSpeed = raw.simulationSpeed === 10 ? 10 : 1;
  state.debugUnlock = raw.debugUnlock === true;
  state.conquest.victories = Math.floor(finite(raw.conquest?.victories));
  // Older Olomouc saves begin the new campaign at Babylon, keeping earned Dominion.
  state.campaign.cityIndex = Math.min(
    cities.length,
    Math.floor(finite(raw.campaign?.cityIndex)),
  );
  // Convert the old one-shot circles to trained ranks without losing automation.
  const rawTraining = raw.upgradeLevels?.circle;
  const legacyTraining =
    raw.upgrades?.circle2 === true
      ? state.campaign.cityIndex >= 6
        ? units.length
        : 6
      : raw.upgrades?.circle === true
        ? 1
        : 0;
  state.upgradeLevels.circle =
    typeof rawTraining === "number" && Number.isFinite(rawTraining)
      ? Math.min(units.length, Math.floor(Math.max(0, rawTraining)))
      : legacyTraining;
  state.upgrades.circle = state.upgradeLevels.circle > 0;
  const last = raw.conquest?.last;
  if (last && typeof last === "object")
    state.conquest.last = {
      cityName:
        typeof last.cityName === "string"
          ? last.cityName.slice(0, 80)
          : "The previous city",
      armyLost: amount(last.armyLost).toString(),
      dominionGained: amount(last.dominionGained).toString(),
      at: finite(last.at),
    };
  return state;
}
export function saveState(state: GameState): boolean {
  const timestamp = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, serializeState(state, timestamp));
    state.lastSave = timestamp;
    return true;
  } catch {
    return false;
  }
}
export function loadState(): GameState {
  loadNotice = "";
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createInitialState();
    try {
      const state = deserializeState(raw);
      loadNotice =
        "Manuscript restored. Time away is not simulated in this prototype.";
      return state;
    } catch {
      // Preserve the unreadable original before a later autosave replaces the active slot.
      localStorage.setItem(SAVE_KEY + "-recovery", raw);
      loadNotice =
        "An unreadable save was backed up locally; a fresh manuscript has opened.";
    }
  } catch {
    loadNotice =
      "Browser storage is unavailable. Progress can only last for this session.";
  }
  return createInitialState();
}

/** Research spending never removes discoveries made during this run. */
export const discoveredKnowledge = (state: GameState): Decimal =>
  state.knowledge.plus(state.knowledgeSpent);

export const regionUnlocked = (state: GameState, region?: string): boolean =>
  !region ||
  regions.some(
    (r) => r.id === region && state.campaign.cityIndex >= r.startIndex,
  );
export const currentRegion = (state: GameState) =>
  regions.find(
    (r) =>
      r.id ===
      cities[Math.min(state.campaign.cityIndex, cities.length - 1)].region,
  )!;
