import assert from "node:assert/strict";
import test from "node:test";
import Decimal from "break_infinity.js";
import {
  createInitialState,
  serializeState,
  deserializeState,
  saveState,
  loadState,
  SAVE_KEY,
  discoveredKnowledge,
  regionUnlocked,
  currentRegion,
} from "../src/lib/state";
import {
  units,
  upgrades,
  rules,
  firstCity,
  cities,
  knowledgeSources,
} from "../src/lib/content";
import {
  tick,
  summon,
  summonCost,
  buyUpgrade,
  armyPower,
  conquer,
  essenceRate,
  isUnlocked,
  currentCity,
  campaignComplete,
  drawPentagram,
  canBuyUpgrade,
  upgradeRequirements,
  unitPower,
  knowledgeRate,
  isAutomated,
  upgradeLevel,
  upgradePrice,
} from "../src/lib/simulation";
import { formatNumber, formatRate } from "../src/lib/format";
import {
  summonCapacity,
  activeSummons,
  runningSummons,
  followerGate,
  canPromote,
  promoteFanatic,
  fanaticSpeed,
} from "../src/lib/cult";
import { summonDuration } from "../src/lib/simulation";

test("drawing funds the first summon and it completes only after its duration", () => {
  const s = createInitialState();
  assert.equal(summon(s, "imp"), false);
  for (let i = 0; i < 9; i++) drawPentagram(s);
  assert.ok(s.knowledge.gt(0));
  assert.ok(summon(s, "spirit"));
  assert.ok(s.units.spirit.eq(0));
  assert.equal(summon(s, "spirit"), false);
  tick(s, 1);
  tick(s, 1);
  tick(s, 0.4);
  assert.ok(s.units.spirit.eq(1));
  for (let i = 0; i < 30; i++) tick(s, 1);
  assert.ok(s.units.spirit.eq(1), "manual summons must not duplicate");
  assert.ok(summonCost(s, units[0]).gt(10));
});

test("Fanatics enable parallel paid summoning; automation respects pause and knowledge gates", () => {
  const s = createInitialState();
  s.essence = new Decimal(1000);
  s.units.lesser_demon = new Decimal(1);
  s.cult.followers = new Decimal(1);
  assert.equal(buyUpgrade(s, "circle"), false);
  s.knowledge = new Decimal(100);
  s.cult.fanatics = new Decimal(6);
  s.cult.fanatics = new Decimal(5);
  assert.ok(summon(s, "spirit", true));
  assert.ok(summon(s, "imp", true));
  tick(s, 1);
  assert.ok(s.progress.spirit > 0 && s.progress.imp > 0);
  assert.ok(buyUpgrade(s, "circle"));
  for (let i = 0; i < 10; i++) tick(s, 1);
  assert.ok(s.units.spirit.gt(1));
  s.automationPaused.spirit = true;
  for (let i = 0; i < 3; i++) tick(s, 1);
  const owned = s.units.spirit;
  for (let i = 0; i < 10; i++) tick(s, 1);
  assert.ok(s.units.spirit.eq(owned));
  s.automationPaused.spirit = false;
  s.essence = new Decimal(0);
  tick(s, 0.05);
  assert.equal(s.active.spirit, false);
  assert.equal(summon(s, "unknown"), false);
});

test("manual and automatic summons share one base circle without charging blocked requests", () => {
  const s = createInitialState();
  s.essence = new Decimal(10000);
  s.knowledge = new Decimal(1000);
  s.units.lesser_demon = new Decimal(1);
  s.cult.followers = new Decimal(1);
  assert.equal(summonCapacity(s), 1);
  assert.ok(summon(s, "spirit"));
  const paid = s.essence.toString();
  assert.equal(summon(s, "imp"), false);
  assert.equal(s.essence.toString(), paid);
  s.upgrades.circle = true;
  s.upgradeLevels.circle = 6;
  for (let i = 0; i < 100; i++) {
    tick(s, 0.1);
    assert.ok(activeSummons(s) <= 1);
  }
});

test("Followers arrive after the first Lesser Demon and promotion spends one Follower plus Essence", () => {
  const s = createInitialState();
  for (let i = 0; i < 30; i++) tick(s, 1);
  assert.ok(s.cult.followers.eq(0));
  s.units.spirit = new Decimal(1);
  for (let i = 0; i < 30; i++) tick(s, 1);
  assert.ok(s.cult.followers.eq(0));
  assert.equal(canPromote(s), false);
  s.units.lesser_demon = new Decimal(1);
  tick(s, 31);
  assert.ok(s.cult.followers.eq(0));
  for (let i = 0; i < 29; i++) tick(s, 1);
  assert.ok(s.cult.followers.eq(1));
  s.essence = new Decimal(1000);
  s.knowledge = new Decimal(10);
  const duration = summonDuration(s, units[0]);
  assert.ok(promoteFanatic(s));
  assert.ok(s.cult.followers.eq(0));
  assert.ok(s.cult.fanatics.eq(1));
  assert.ok(s.essence.eq(900));
  assert.ok(s.knowledge.eq(10));
  assert.equal(promoteFanatic(s), false);
  assert.ok(summonDuration(s, units[0]) < duration);
  assert.ok(fanaticSpeed(s).eq(1.1));
  assert.equal(summonCapacity(s), 1);
  s.cult.followers = new Decimal(2);
  s.essence = new Decimal(1000);
  assert.ok(promoteFanatic(s));
  assert.equal(summonCapacity(s), 1);
  assert.ok(s.essence.eq(845));
  assert.ok(promoteFanatic(s));
  assert.equal(summonCapacity(s), 1);
  s.cult.fanatics = new Decimal(5);
  assert.equal(summonCapacity(s), 2);
  const restored = deserializeState(serializeState(s));
  assert.ok(restored.cult.fanatics.eq(5));
  assert.ok(restored.cult.awakened);
  assert.equal(restored.cult.progress, s.cult.progress);
  restored.cult.fanatics = new Decimal("1e100");
  assert.equal(summonCapacity(restored), 6);
  restored.campaign.cityIndex = 6;
  assert.equal(summonCapacity(restored), 12);
});

test("Followers also arrive when a higher-tier demon is the first completed demon", () => {
  const s = createInitialState();
  s.units.demon = new Decimal(1);

  assert.equal(followerGate(s), true);
  for (let i = 0; i < 30; i++) tick(s, 1);

  assert.ok(s.cult.followers.eq(1));
});

test("legacy simultaneous summons are paid queued jobs, preserved across reload", () => {
  const raw = JSON.parse(serializeState(createInitialState()));
  delete raw.cult;
  delete raw.summonOrder;
  raw.active = { spirit: true, imp: true };
  raw.progress = { spirit: 1, imp: 2 };
  let s = deserializeState(JSON.stringify(raw));
  assert.deepEqual(runningSummons(s), ["spirit"]);
  tick(s, 0.5);
  assert.equal(s.progress.imp, 2);
  s = deserializeState(serializeState(s));
  assert.deepEqual(s.summonOrder, ["spirit", "imp"]);
  tick(s, 1);
  assert.ok(s.units.spirit.eq(1));
  assert.deepEqual(runningSummons(s), ["imp"]);
  for (let i = 0; i < 4; i++) tick(s, 1);
  assert.ok(s.units.imp.eq(1));
  assert.equal(activeSummons(s), 0);
});

test("conquest resets temporary progress and advances Babylon to Nineveh", () => {
  const s = createInitialState(),
    baseRate = essenceRate(s);
  assert.equal(conquer(s), false);
  s.units.greater_demon = firstCity.strength.div(8000).ceil();
  s.upgrades.circle = true;
  s.active.spirit = true;
  s.runTime = 600;
  s.cult.followers = new Decimal(10);
  s.cult.fanatics = new Decimal(3);
  s.cult.awakened = true;
  assert.ok(conquer(s));
  assert.ok(s.dominion.eq(rules.conquestReward));
  assert.ok(units.every((u) => s.units[u.id].eq(0)));
  assert.deepEqual(s.upgrades, {});
  assert.deepEqual(s.active, {});
  assert.ok(s.cult.followers.eq(0));
  assert.ok(s.cult.fanatics.eq(0));
  assert.equal(s.cult.awakened, false);
  assert.equal(summonCapacity(s), 1);
  assert.equal(s.runTime, 0);
  assert.equal(s.conquest.victories, 1);
  assert.equal(
    s.conquest.last?.armyLost,
    firstCity.strength.div(8000).ceil().toString(),
  );
  assert.equal(s.conquest.last?.cityName, "Babylon");
  assert.equal(currentCity(s).name, "Nineveh");
  assert.equal(deserializeState(serializeState(s)).campaign.cityIndex, 1);
  assert.ok(essenceRate(s).eq(baseRate.times(1.5)));
  assert.ok(summonCost(s, units[0]).eq(10), "Dominion must not increase costs");
  s.units.greater_demon = firstCity.strength.div(8000).ceil();
  assert.equal(conquer(s), false, "the second city uses its higher defense");
});

test("all cities advance in order, persist, and the final victory cannot be farmed", () => {
  let s = createInitialState();
  let reward = 0;
  for (const city of cities) {
    assert.equal(currentCity(s).id, city.id);
    s.units.greater_demon = city.strength.div(8000).ceil();
    assert.ok(conquer(s));
    reward += city.reward;
    assert.ok(s.dominion.eq(reward));
    s = deserializeState(serializeState(s));
  }
  assert.ok(campaignComplete(s));
  assert.equal(currentCity(s), undefined);
  s.units.greater_demon = new Decimal("1e100");
  assert.equal(conquer(s), false);
  assert.ok(s.dominion.eq(reward));
  assert.equal(s.conquest.victories, cities.length);
  assert.equal(createInitialState().campaign.cityIndex, 0);
});

test("old saves retain Dominion and start Babylon; invalid campaign indices are bounded", () => {
  const legacy = JSON.parse(serializeState(createInitialState()));
  delete legacy.campaign;
  legacy.dominion = "20";
  legacy.conquest.victories = 2;
  const migrated = deserializeState(JSON.stringify(legacy));
  assert.equal(currentCity(migrated).name, "Babylon");
  assert.ok(migrated.dominion.eq(20));
  legacy.campaign = { cityIndex: -1 };
  assert.equal(deserializeState(JSON.stringify(legacy)).campaign.cityIndex, 0);
  legacy.campaign.cityIndex = 999;
  assert.ok(campaignComplete(deserializeState(JSON.stringify(legacy))));
});

test("save round trip preserves huge numbers and in-flight summons; malformed fields are sanitized", () => {
  const s = createInitialState();
  s.essence = new Decimal("1e400");
  s.knowledge = new Decimal(1000);
  summon(s, "spirit");
  tick(s, 1);
  s.automationPaused.imp = true;
  const restored = deserializeState(serializeState(s, 12345));
  assert.ok(restored.essence.eq(s.essence));
  assert.equal(restored.lastSave, 12345);
  assert.equal(restored.active.spirit, true);
  assert.equal(restored.progress.spirit, s.progress.spirit);
  assert.equal(restored.automationPaused.imp, true);
  const broken = deserializeState(
    JSON.stringify({
      version: "0.0.1",
      essence: "NaN",
      knowledge: -7,
      units: { spirit: "Infinity" },
      progress: { spirit: -3 },
      simulationSpeed: 1000,
      cityIndex: 999,
    }),
  );
  assert.ok(broken.essence.eq(rules.initialEssence));
  assert.ok(broken.knowledge.eq(0));
  assert.ok(broken.units.spirit.eq(0));
  assert.equal(broken.simulationSpeed, 1);
  assert.throws(() => deserializeState('{"version":"99"}'));
});

test("storage failures are contained and invalid saves are backed up", () => {
  const entries = new Map<string, string>();
  const storage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value);
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  const s = createInitialState();
  assert.ok(saveState(s));
  assert.ok(s.lastSave > 0);
  assert.ok(loadState().essence.eq(s.essence));
  entries.set(SAVE_KEY, "{broken");
  loadState();
  assert.equal(entries.get(SAVE_KEY + "-recovery"), "{broken");
  storage.setItem = () => {
    throw new Error("Quota exceeded");
  };
  assert.equal(saveState(s), false);
});

test("number formatting retains fractional rates and supports huge notation", () => {
  assert.equal(formatRate(0.4), "+0.4 / sec");
  assert.equal(formatNumber(1420), "1,420");
  assert.equal(formatNumber(1250000), "1.25 M");
  assert.equal(formatNumber(new Decimal("7.14e12")), "7.14 T");
  assert.equal(formatNumber(new Decimal("1e400")), "1.00e400");
});

function playRun(dominion = 0) {
  const s = createInitialState();
  s.dominion = new Decimal(dominion);
  const milestones: Record<string, number> = {};
  // Active play: trace every 10 seconds, alternate study and manual summons,
  // then study alongside automated circles. Never inject free resources.
  for (let seconds = 0; seconds < 3600; seconds++) {
    if (seconds % 10 === 0) drawPentagram(s);
    if (seconds % 2 === 0) {
      if (canPromote(s) && s.essence.gte(300)) promoteFanatic(s);
      const research = [...upgrades]
        .sort((a, b) => a.knowledge - b.knowledge)
        .find((u) => canBuyUpgrade(s, u.id));
      if (research) buyUpgrade(s, research.id);
      const manual = s.summonOrder.some(
        (id) => s.active[id] && (!isAutomated(s, id) || s.automationPaused[id]),
      );
      const study = [...knowledgeSources]
        .reverse()
        .find((source) => discoveredKnowledge(s).gte(source.requirement))!;
      if (!manual) {
        s.knowledgeSource =
          units
            .filter((_, i) => isUnlocked(s, i))
            .every((u) => isAutomated(s, u.id)) || seconds % 24 < 14
            ? study.id
            : null;
        if (!s.knowledgeSource) {
          const target = [...units]
            .reverse()
            .find(
              (u) =>
                isUnlocked(s, units.indexOf(u)) &&
                !s.active[u.id] &&
                s.essence.gte(summonCost(s, u)),
            );
          if (target) summon(s, target.id);
        }
      }
    }
    tick(s, 1);
    for (const u of units)
      if (s.units[u.id].gt(0) && !milestones[u.id])
        milestones[u.id] = seconds + 1;
    if (s.upgrades.circle && !milestones.automation)
      milestones.automation = seconds + 1;
    if (armyPower(s).gte(firstCity.strength))
      return {
        seconds: seconds + 1,
        milestones,
        researched: Object.keys(s.upgrades).length,
      };
  }
  return {
    seconds: 3600,
    milestones,
    power: armyPower(s).toString(),
    knowledge: discoveredKnowledge(s).toString(),
  };
}

test("active first conquest takes 15–25 minutes and Dominion accelerates the same benchmark", () => {
  const first = playRun(),
    second = playRun(10);
  console.log("Balance evidence:", JSON.stringify({ first, second }));
  assert.ok(
    first.seconds >= 900 && first.seconds <= 1500,
    "first run target: " + first.seconds,
  );
  assert.ok(second.seconds < first.seconds);
});

test("research spends both currencies once without removing discoveries", () => {
  const s = createInitialState();
  s.essence = new Decimal(5000);
  s.knowledge = new Decimal(6000);
  s.knowledgeSource = "stars";
  assert.ok(buyUpgrade(s, "pentagram"));
  assert.ok(s.knowledge.eq(5992));
  assert.ok(s.essence.eq(4880));
  assert.ok(discoveredKnowledge(s).eq(6000));
  assert.ok(isUnlocked(s, 5));
  const saved = serializeState(s, 0);
  assert.equal(buyUpgrade(s, "pentagram"), false);
  assert.equal(serializeState(s, 0), saved);
  const restored = deserializeState(saved);
  assert.ok(restored.knowledgeSpent.eq(8));
  assert.equal(restored.knowledgeSource, "stars");
  assert.ok(isUnlocked(restored, 5));
});

test("multi-parent research requires every parent and rejects unaffordable purchases atomically", () => {
  const s = createInitialState();
  s.essence = new Decimal(1e6);
  s.knowledge = new Decimal(1e6);
  s.upgrades.circle = true;
  const before = serializeState(s, 0);
  assert.equal(buyUpgrade(s, "circle3"), false);
  assert.equal(serializeState(s, 0), before);
  s.upgrades.pentagram2 = true;
  assert.ok(buyUpgrade(s, "circle3"));
  s.knowledge = new Decimal(0);
  const poor = serializeState(s, 0);
  assert.equal(buyUpgrade(s, "study"), false);
  assert.equal(serializeState(s, 0), poor);
});

test("research graph has unique IDs, valid parents, no cycles, and late Knowledge costs", () => {
  assert.equal(new Set(upgrades.map((u) => u.id)).size, upgrades.length);
  function visit(id: string, ancestors: string[] = []) {
    assert.ok(!ancestors.includes(id), "cycle at " + id);
    const u = upgrades.find((u) => u.id === id);
    assert.ok(u, "missing " + id);
    for (const parent of upgradeRequirements(u))
      visit(parent, [...ancestors, id]);
  }
  for (const u of upgrades) visit(u.id);
  assert.ok(upgrades.filter((u) => u.knowledge >= 5000).length >= 10);
});

test("legacy saves default research spending to zero and conquest clears it", () => {
  const raw = JSON.parse(serializeState(createInitialState()));
  delete raw.knowledgeSpent;
  raw.knowledge = "500";
  raw.upgrades = { circle2: true };
  const s = deserializeState(JSON.stringify(raw));
  assert.ok(discoveredKnowledge(s).eq(500));
  assert.equal(upgradeLevel(s, "circle"), 6);
  s.knowledgeSpent = new Decimal(1000);
  s.units.greater_demon = new Decimal(100);
  assert.ok(conquer(s));
  assert.ok(s.knowledgeSpent.eq(0));
});

test("pentagram rewards retain Production scaling", () => {
  const s = createInitialState();
  s.dominion = new Decimal(20);
  const essence = s.essence;
  drawPentagram(s);
  assert.ok(s.essence.eq(essence.plus(2)));
  assert.ok(s.knowledge.eq(0.5));
});

test("Alexandria opens Slavic, resets temporary progress, and awards Dominion only once", () => {
  const s = createInitialState();
  s.campaign.cityIndex = 5;
  s.conquest.victories = 5;
  s.dominion = new Decimal(105);
  s.units.greater_demon = new Decimal(1500);
  assert.equal(regionUnlocked(s, "slavic"), false);
  assert.ok(conquer(s));
  assert.equal(currentCity(s).id, "nitra");
  assert.equal(currentRegion(s).id, "slavic");
  assert.ok(regionUnlocked(s, "slavic"));
  assert.equal(campaignComplete(s), false);
  assert.ok(s.dominion.eq(155));
  assert.ok(units.every((u) => s.units[u.id].eq(0)));
  assert.equal(conquer(s), false);
  assert.ok(s.dominion.eq(155));
  assert.equal(currentCity(deserializeState(serializeState(s))).id, "nitra");
});

test("old completed Alexandria saves resume at Nitra with zero new units", () => {
  const raw = JSON.parse(serializeState(createInitialState()));
  raw.campaign.cityIndex = 6;
  raw.conquest.victories = 6;
  raw.dominion = "155";
  for (const u of units.filter((u) => u.region)) {
    delete raw.units[u.id];
    delete raw.progress[u.id];
  }
  const s = deserializeState(JSON.stringify(raw));
  assert.equal(currentCity(s).id, "nitra");
  assert.equal(campaignComplete(s), false);
  assert.ok(s.dominion.eq(155));
  for (const u of units.filter((u) => u.region)) {
    assert.ok(s.units[u.id].eq(0));
    assert.equal(s.progress[u.id], 0);
  }
});

test("Slavic units and research cannot bypass Alexandria with Knowledge or debug reveal", () => {
  const s = createInitialState();
  s.essence = new Decimal("1e20");
  s.knowledge = new Decimal("1e20");
  s.debugUnlock = true;
  for (const u of upgrades.filter((u) => !u.region)) s.upgrades[u.id] = true;
  for (const u of units.filter((u) => u.region)) {
    assert.equal(isUnlocked(s, units.indexOf(u)), false);
    assert.equal(summon(s, u.id), false);
  }
  for (const u of upgrades.filter((u) => u.region))
    assert.equal(buyUpgrade(s, u.id), false);
  s.campaign.cityIndex = 6;
  s.debugUnlock = false;
  for (const u of upgrades.filter((u) => u.region))
    assert.ok(buyUpgrade(s, u.id));
});

test("all six Slavic entities unlock through Knowledge and complete paid summons", () => {
  const s = createInitialState();
  s.campaign.cityIndex = 6;
  s.essence = new Decimal("1e12");
  for (const u of units.filter((u) => u.region)) {
    s.knowledge = u.unlockKnowledge.minus(1);
    assert.equal(isUnlocked(s, units.indexOf(u)), false);
    s.knowledge = u.unlockKnowledge;
    assert.ok(isUnlocked(s, units.indexOf(u)));
    const before = s.essence;
    assert.ok(summon(s, u.id));
    assert.ok(s.essence.eq(before.minus(u.baseCost)));
    for (let i = 0; i < u.summonTime; i++) tick(s, 1);
    assert.ok(s.units[u.id].eq(1), u.name);
    assert.equal(s.active[u.id], false);
  }
  const restored = deserializeState(serializeState(s));
  assert.ok(
    units.filter((u) => u.region).every((u) => restored.units[u.id].eq(1)),
  );
  assert.ok(knowledgeRate(s).gt(0));
});

test("Slavic power research affects only the new entities and trained Fanatics automate them", () => {
  const s = createInitialState();
  s.campaign.cityIndex = 6;
  const old = units.find((u) => u.id === "greater_demon")!,
    fresh = units.find((u) => u.id === "cert")!;
  s.upgrades.incense2 = true;
  assert.ok(unitPower(s, old).eq(old.power.times(1.3)));
  assert.ok(unitPower(s, fresh).eq(fresh.power));
  s.upgrades.slavic_incense = true;
  assert.ok(unitPower(s, fresh).eq(fresh.power.times(2)));
  assert.ok(unitPower(s, old).eq(old.power.times(1.3)));
  s.units.lesser_demon = new Decimal(1);
  s.cult.fanatics = new Decimal(1);
  s.upgrades.circle = true;
  s.upgradeLevels.circle = 12;
  for (const u of units.filter((u) => u.region))
    assert.ok(isAutomated(s, u.id));
  s.essence = new Decimal("1e12");
  s.knowledge = new Decimal("1e6");
  tick(s, 0.05);
  assert.equal(s.active.cert, true);
  assert.ok(activeSummons(s) <= summonCapacity(s));
});

test("one repeatable research teaches exactly one more entity and charges rising prices", () => {
  const s = createInitialState();
  s.campaign.cityIndex = 6;
  s.essence = new Decimal("1e12");
  s.knowledge = new Decimal("1e9");
  s.units.lesser_demon = new Decimal(1);
  s.cult.fanatics = new Decimal(1);
  const training = upgrades.find((u) => u.id === "circle")!;
  assert.equal(upgrades.filter((u) => u.kind === "automation").length, 1);
  for (let level = 0; level < units.length; level++) {
    const price = upgradePrice(s, training),
      beforeE = s.essence,
      beforeK = s.knowledge;
    assert.ok(price.essence.eq(new Decimal(180).times(Decimal.pow(3, level))));
    assert.ok(price.knowledge.eq(new Decimal(18).times(Decimal.pow(2, level))));
    assert.ok(buyUpgrade(s, "circle"));
    assert.equal(upgradeLevel(s, "circle"), level + 1);
    assert.ok(s.essence.eq(beforeE.minus(price.essence)));
    assert.ok(s.knowledge.eq(beforeK.minus(price.knowledge)));
    for (let index = 0; index < units.length; index++)
      assert.equal(isAutomated(s, units[index].id), index <= level);
  }
  const before = serializeState(s, 0);
  assert.equal(buyUpgrade(s, "circle"), false);
  assert.equal(serializeState(s, 0), before);
});

test("Fanatic count cannot replace training and training does not lock manual summons", () => {
  const s = createInitialState();
  s.units.lesser_demon = new Decimal(1);
  s.cult.fanatics = new Decimal(50);
  s.essence = new Decimal(1e6);
  s.knowledge = new Decimal(10000);
  assert.equal(isAutomated(s, "spirit"), false);
  assert.ok(summon(s, "imp"));
  assert.ok(buyUpgrade(s, "circle"));
  assert.equal(isAutomated(s, "spirit"), true);
  assert.equal(isAutomated(s, "imp"), false);
  s.cult.fanatics = new Decimal(0);
  assert.equal(isAutomated(s, "spirit"), false);
});

test("training pauses at the region boundary and survives saves, then resets on conquest", () => {
  let s = createInitialState();
  s.essence = new Decimal(1e9);
  s.knowledge = new Decimal(1e9);
  for (let i = 0; i < 6; i++) assert.ok(buyUpgrade(s, "circle"));
  const before = serializeState(s, 0);
  assert.equal(buyUpgrade(s, "circle"), false);
  assert.equal(serializeState(s, 0), before);
  s = deserializeState(serializeState(s));
  assert.equal(upgradeLevel(s, "circle"), 6);
  s.campaign.cityIndex = 6;
  assert.ok(buyUpgrade(s, "circle"));
  assert.equal(upgradeLevel(s, "circle"), 7);
  s.units.cert = new Decimal(1);
  assert.ok(conquer(s));
  assert.equal(upgradeLevel(s, "circle"), 0);
});

test("legacy circles migrate to trained ranks and invalid levels are sanitized", () => {
  const raw = JSON.parse(serializeState(createInitialState()));
  delete raw.upgradeLevels;
  raw.upgrades = { circle: true };
  assert.equal(
    upgradeLevel(deserializeState(JSON.stringify(raw)), "circle"),
    1,
  );
  raw.upgrades = { circle2: true };
  assert.equal(
    upgradeLevel(deserializeState(JSON.stringify(raw)), "circle"),
    6,
  );
  raw.campaign.cityIndex = 6;
  assert.equal(
    upgradeLevel(deserializeState(JSON.stringify(raw)), "circle"),
    12,
  );
  for (const [value, expected] of [
    [-2, 0],
    [2.7, 2],
    [999, 12],
  ]) {
    raw.upgradeLevels = { circle: value };
    assert.equal(
      upgradeLevel(deserializeState(JSON.stringify(raw)), "circle"),
      expected,
    );
  }
});
