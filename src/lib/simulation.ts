import Decimal from "break_infinity.js";
import { units, upgrades, cities, rules, knowledgeSources } from "./content";
import {
  createInitialState,
  discoveredKnowledge,
  regionUnlocked,
} from "./state";
import {
  summonCapacity,
  activeSummons,
  runningSummons,
  fanaticSpeed,
  tickFollowers,
  followerGate,
} from "./cult";
import type {
  GameState,
  UnitDefinition,
  UpgradeKind,
  UpgradeDefinition,
} from "./types";

export const upgradeLevel = (state: GameState, id: string): number =>
  state.upgradeLevels[id] ?? (state.upgrades[id] === true ? 1 : 0);
export const upgradePrice = (state: GameState, upgrade: UpgradeDefinition) => {
  const level = upgrade.repeatable ? upgradeLevel(state, upgrade.id) : 0;
  return {
    essence: upgrade.cost.times(Decimal.pow(3, level)),
    knowledge: new Decimal(upgrade.knowledge).times(Decimal.pow(2, level)),
  };
};
export const upgradeMaxed = (state: GameState, upgrade: UpgradeDefinition) =>
  upgrade.repeatable
    ? upgradeLevel(state, upgrade.id) >= units.length
    : hasUpgrade(state, upgrade.id);
export const nextTrainingEntity = (state: GameState) =>
  units[upgradeLevel(state, "circle")];
export const trainingRegionLocked = (state: GameState) => {
  const next = nextTrainingEntity(state);
  return !!next && !regionUnlocked(state, next.region);
};
export const hasUpgrade = (state: GameState, id: string) =>
  state.upgrades[id] === true;
export const currentCity = (state: GameState) =>
  cities[state.campaign.cityIndex];
export const campaignComplete = (state: GameState) =>
  state.campaign.cityIndex >= cities.length;
export const dominionMultiplier = (state: GameState) =>
  state.dominion.times(rules.dominionBonus).plus(1);
export function multiplier(state: GameState, kind: UpgradeKind): Decimal {
  return upgrades
    .filter((u) => u.kind === kind && hasUpgrade(state, u.id))
    .reduce(
      (value, u) => value.times(u.factor),
      kind === "essence" || kind === "knowledge"
        ? dominionMultiplier(state)
        : new Decimal(1),
    );
}
export const unitPower = (state: GameState, unit: UnitDefinition) =>
  unit.power
    .times(multiplier(state, "power"))
    .times(
      unit.tier >= 4 && unit.tier <= 6 ? multiplier(state, "demonPower") : 1,
    )
    .times(unit.region === "slavic" ? multiplier(state, "slavicPower") : 1);
export const armyPower = (state: GameState) =>
  units.reduce(
    (total, unit) =>
      total.plus(state.units[unit.id].times(unitPower(state, unit))),
    new Decimal(0),
  );
export const essenceRate = (state: GameState) =>
  units
    .reduce(
      (total, unit) =>
        total.plus(state.units[unit.id].times(unit.essencePerSecond)),
      new Decimal(rules.baseEssence),
    )
    .times(multiplier(state, "essence"));
export const knowledgeRate = (state: GameState) =>
  (state.knowledgeSource
    ? new Decimal(
        knowledgeSources.find((s) => s.id === state.knowledgeSource)?.value ??
          0,
      )
    : new Decimal(0)
  )
    .plus(state.units.imp.times(0.025))
    .plus(state.units.familiar.times(0.06))
    .plus(
      units.reduce(
        (total, unit) =>
          total.plus(state.units[unit.id].times(unit.knowledgePerSecond ?? 0)),
        new Decimal(0),
      ),
    )
    .times(multiplier(state, "knowledge"));
export const pentagramReward = (state: GameState) => ({
  essence: dominionMultiplier(state),
  knowledge: dominionMultiplier(state).times(0.25),
});
export function drawPentagram(state: GameState): void {
  const reward = pentagramReward(state);
  state.essence = state.essence.plus(reward.essence);
  state.knowledge = state.knowledge.plus(reward.knowledge);
}
export const isUnlocked = (state: GameState, index: number) =>
  !!units[index] &&
  regionUnlocked(state, units[index].region) &&
  (state.debugUnlock ||
    discoveredKnowledge(state).gte(units[index].unlockKnowledge) ||
    state.units[units[index].id].gt(0));
export const summonCost = (state: GameState, unit: UnitDefinition) =>
  unit.baseCost
    .times(Decimal.pow(rules.costGrowth, state.units[unit.id].toNumber()))
    .times(multiplier(state, "cost"));
export const summonDuration = (state: GameState, unit: UnitDefinition) =>
  unit.summonTime /
  multiplier(state, "speed").times(fanaticSpeed(state)).toNumber();
export const isAutomated = (state: GameState, id: string) => {
  const index = units.findIndex((u) => u.id === id);
  if (
    index < 0 ||
    !regionUnlocked(state, units[index].region) ||
    !followerGate(state)
  )
    return false;
  return state.cult.fanatics.gte(1) && index < upgradeLevel(state, "circle");
};
export function summon(
  state: GameState,
  id: string,
  automated = false,
): boolean {
  const index = units.findIndex((u) => u.id === id),
    unit = units[index];
  if (
    !unit ||
    !isUnlocked(state, index) ||
    state.active[id] ||
    (!automated &&
      state.summonOrder.some(
        (activeId) =>
          state.active[activeId] &&
          (!isAutomated(state, activeId) || state.automationPaused[activeId]),
      )) ||
    (!automated && state.knowledgeSource) ||
    activeSummons(state) >= summonCapacity(state)
  )
    return false;
  const cost = summonCost(state, unit);
  if (state.essence.lt(cost)) return false;
  state.essence = state.essence.minus(cost);
  state.active[id] = true;
  state.progress[id] = 0;
  state.summonOrder.push(id);
  return true;
}
export const upgradeRequirements = (upgrade: {
  requires?: string | string[];
}): string[] =>
  typeof upgrade.requires === "string"
    ? [upgrade.requires]
    : (upgrade.requires ?? []);
export function canBuyUpgrade(state: GameState, id: string): boolean {
  const u = upgrades.find((u) => u.id === id);
  return (
    !!u &&
    regionUnlocked(state, u.region) &&
    !upgradeMaxed(state, u) &&
    (!u.repeatable || !trainingRegionLocked(state)) &&
    state.essence.gte(upgradePrice(state, u).essence) &&
    state.knowledge.gte(upgradePrice(state, u).knowledge) &&
    upgradeRequirements(u).every((id) => hasUpgrade(state, id))
  );
}
export function buyUpgrade(state: GameState, id: string): boolean {
  if (!canBuyUpgrade(state, id)) return false;
  const upgrade = upgrades.find((u) => u.id === id)!;
  const price = upgradePrice(state, upgrade);
  state.essence = state.essence.minus(price.essence);
  state.knowledge = state.knowledge.minus(price.knowledge);
  state.knowledgeSpent = state.knowledgeSpent.plus(price.knowledge);
  if (upgrade.repeatable) state.upgradeLevels[id] = upgradeLevel(state, id) + 1;
  state.upgrades[id] = true;
  return true;
}
/** One simulation clock. Substeps keep accelerated play consistent and every summon paid. */
export function tick(state: GameState, rawDelta: number): void {
  if (!Number.isFinite(rawDelta) || rawDelta <= 0) return;
  let remaining = Math.min(rawDelta, 1) * state.simulationSpeed;
  while (remaining > 1e-8) {
    const delta = Math.min(remaining, 0.05);
    remaining -= delta;
    state.runTime += delta;
    state.essence = state.essence.plus(essenceRate(state).times(delta));
    state.knowledge = state.knowledge.plus(knowledgeRate(state).times(delta));
    tickFollowers(state, delta);
    // Paid summons from older saves wait in order instead of exceeding the new capacity.
    for (const id of runningSummons(state)) {
      const unit = units.find((u) => u.id === id)!;
      state.progress[id] += delta;
      if (state.progress[id] + 1e-8 >= summonDuration(state, unit)) {
        state.units[id] = state.units[id].plus(1);
        state.progress[id] = 0;
        state.active[id] = false;
        state.summonOrder = state.summonOrder.filter((queued) => queued !== id);
      }
    }
    // Automation shares the same capacity check as manual summoning.
    for (const unit of [...units].reverse()) {
      if (isAutomated(state, unit.id) && !state.automationPaused[unit.id])
        summon(state, unit.id, true);
    }
  }
}
export function conquer(state: GameState): boolean {
  const city = currentCity(state);
  if (!city || armyPower(state).lt(city.strength)) return false;
  const armyLost = units
    .reduce((n, u) => n.plus(state.units[u.id]), new Decimal(0))
    .toString();
  const dominion = state.dominion.plus(city.reward);
  const campaign = { cityIndex: state.campaign.cityIndex + 1 };
  const conquest = {
    victories: state.conquest.victories + 1,
    last: {
      cityName: city.name,
      armyLost,
      dominionGained: String(city.reward),
      at: Date.now(),
    },
  };
  Object.assign(state, createInitialState(), { dominion, conquest, campaign });
  return true;
}
