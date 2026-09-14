import Decimal from "break_infinity.js";
import { cultRules, units, rules, upgrades } from "./content";
import { discoveredKnowledge, regionUnlocked } from "./state";
import type { GameState } from "./types";

export const summonCapacity = (state: GameState) =>
  Math.min(
    units.filter((u) => regionUnlocked(state, u.region)).length,
    state.cult.fanatics
      .div(cultRules.fanaticsPerCircle)
      .floor()
      .plus(1)
      .toNumber(),
  );
export const fanaticSpeed = (state: GameState) =>
  state.cult.fanatics.times(cultRules.speedPerFanatic).plus(1);
export const activeSummons = (state: GameState) =>
  units.filter((u) => state.active[u.id]).length;
export const runningSummons = (state: GameState) =>
  state.summonOrder
    .filter((id) => state.active[id])
    .slice(0, summonCapacity(state));
export const followerMultiplier = (state: GameState) =>
  upgrades
    .filter((u) => u.kind === "follower" && state.upgrades[u.id])
    .reduce((n, u) => n.times(u.factor), new Decimal(1));
export const followerInterval = (state: GameState) =>
  cultRules.followerInterval /
  state.dominion
    .times(rules.dominionBonus)
    .plus(1)
    .times(followerMultiplier(state))
    .toNumber();
export const followerGate = (state: GameState) =>
  state.units[cultRules.fanaticUnlockUnit].gt(0);
export const fanaticPromotionCost = (state: GameState) =>
  new Decimal(cultRules.promotionEssence).times(
    Decimal.pow(cultRules.promotionCostGrowth, state.cult.fanatics.toNumber()),
  );
export const canPromote = (state: GameState) =>
  followerGate(state) &&
  state.cult.awakened &&
  state.cult.followers.gte(cultRules.followersPerFanatic) &&
  state.essence.gte(fanaticPromotionCost(state)) &&
  discoveredKnowledge(state).gte(cultRules.promotionKnowledge);

export function promoteFanatic(state: GameState): boolean {
  if (!canPromote(state)) return false;
  state.cult.followers = state.cult.followers.minus(
    cultRules.followersPerFanatic,
  );
  state.essence = state.essence.minus(fanaticPromotionCost(state));
  state.cult.fanatics = state.cult.fanatics.plus(1);
  return true;
}

export function tickFollowers(state: GameState, delta: number): void {
  if (!followerGate(state)) {
    state.cult.progress = 0;
    return;
  }
  if (!state.cult.awakened && units.some((u) => state.units[u.id].gt(0)))
    state.cult.awakened = true;
  if (!state.cult.awakened) return;
  state.cult.progress += delta;
  const interval = followerInterval(state);
  if (state.cult.progress + 1e-8 >= interval) {
    const gained = Math.floor((state.cult.progress + 1e-8) / interval);
    state.cult.followers = state.cult.followers.plus(new Decimal(gained));
    state.cult.progress = Math.max(0, state.cult.progress - gained * interval);
  }
}
