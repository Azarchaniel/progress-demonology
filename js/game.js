const UNIT_DEFS = [
  {
    id: "spirit",
    name: "Lesser Spirit",
    tier: 1,
    cost: 10,
    time: 2.4,
    power: 1,
    knowledge: 0,
    essence: 0.5,
    unlock: 0,
  },
  {
    id: "imp",
    name: "Imp",
    tier: 2,
    cost: 75,
    time: 5,
    power: 5,
    knowledge: 10,
    essence: 2,
    unlock: 0,
  },
  {
    id: "familiar",
    name: "Familiar",
    tier: 3,
    cost: 350,
    time: 9,
    power: 25,
    knowledge: 35,
    essence: 7,
    unlock: 2,
  },
  {
    id: "lesser_demon",
    name: "Lesser Demon",
    tier: 4,
    cost: 1500,
    time: 16,
    power: 150,
    knowledge: 100,
    essence: 20,
    unlock: 8,
  },
  {
    id: "demon",
    name: "Demon",
    tier: 5,
    cost: 8000,
    time: 28,
    power: 1000,
    knowledge: 250,
    essence: 60,
    unlock: 20,
  },
  {
    id: "greater_demon",
    name: "Greater Demon",
    tier: 6,
    cost: 40000,
    time: 48,
    power: 8000,
    knowledge: 700,
    essence: 150,
    unlock: 50,
  },
];
const UPGRADES = [
  {
    id: "pentagram",
    name: "Pentagram I",
    desc: "Summoning speed +15%",
    cost: 120,
    type: "speed",
  },
  {
    id: "geometry",
    name: "Sacred Geometry I",
    desc: "Summon costs −15%",
    cost: 220,
    type: "cost",
  },
  {
    id: "candles",
    name: "Black Candles",
    desc: "Essence generation +25%",
    cost: 300,
    type: "essence",
  },
  {
    id: "incense",
    name: "Frankincense",
    desc: "Army power +20%",
    cost: 500,
    type: "power",
  },
  {
    id: "circle",
    name: "Summoning Circle I",
    desc: "Automatically summons Lesser Spirits",
    cost: 650,
    type: "auto",
  },
];
const fresh = () => ({
  version: "0.0.1",
  essence: 7,
  knowledge: 0,
  dominion: 0,
  units: Object.fromEntries(UNIT_DEFS.map((u) => [u.id, 0])),
  progress: Object.fromEntries(UNIT_DEFS.map((u) => [u.id, 0])),
  upgrades: {},
  city: 0,
  runTime: 0,
  lastSave: Date.now(),
  speed: 1,
});
let state = load();
function load() {
  try {
    return { ...fresh(), ...JSON.parse(localStorage.getItem("pd-save")) };
  } catch {
    return fresh();
  }
}
function save() {
  state.lastSave = Date.now();
  localStorage.setItem("pd-save", JSON.stringify(state));
}
function fmt(n) {
  if (n < 1000) return Math.floor(n).toLocaleString();
  const units = ["K", "M", "B", "T"];
  let i = -1;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return n.toFixed(n < 10 ? 2 : 1) + " " + units[i];
}
function has(id) {
  return state.upgrades[id];
}
function mult(type) {
  let x = 1 + state.dominion * 0.05;
  if (type === "speed" && has("pentagram")) x *= 1.15;
  if (type === "cost" && has("geometry")) x *= 0.85;
  if (type === "essence" && has("candles")) x *= 1.25;
  if (type === "power" && has("incense")) x *= 1.2;
  return x;
}
function power() {
  return (
    UNIT_DEFS.reduce((n, u) => n + state.units[u.id] * u.power, 0) *
    mult("power")
  );
}
function render() {
  document.querySelector("#essence").textContent = fmt(state.essence);
  document.querySelector("#knowledge").textContent = fmt(state.knowledge);
  document.querySelector("#dominion").textContent = fmt(state.dominion);
  document.querySelector("#army-power").textContent = fmt(power());
  document.querySelector("#your-power").textContent = fmt(power());
  document.querySelector("#runtime").textContent =
    Math.floor(state.runTime / 60) +
    ":" +
    String(Math.floor(state.runTime % 60)).padStart(2, "0");
  let city = [
    ["Olomouc", 100],
    ["Brno", 1000],
    ["Prague", 10000],
  ][state.city] || ["Vienna", 100000];
  document.querySelector("#city-name").textContent = city[0];
  document.querySelector("#city-title").textContent = city[0];
  document.querySelector("#city-strength").textContent = fmt(city[1]);
  let chance = Math.min(99, Math.floor((power() / city[1]) * 100));
  document.querySelector("#victory").textContent = chance + "%";
  document.querySelector("#city-bar").style.width =
    Math.min(100, (power() / city[1]) * 100) + "%";
  document.querySelector("#conquer").disabled = power() < city[1];
  document.querySelector("#unit-list").innerHTML = UNIT_DEFS.map((u) => {
    let unlocked =
      state.units[u.id] > 0 || power() >= u.unlock * u.power || u.unlock === 0;
    let cost = Math.ceil(u.cost * mult("cost"));
    let pct = (state.progress[u.id] / u.time) * 100;
    return `<div class="unit ${unlocked ? "" : "locked"}"><div class="unit-head"><span class="unit-name">${unlocked ? u.name : "???"}</span><span>Tier ${u.tier} · ${fmt(state.units[u.id])}</span></div>${unlocked ? `<div class="bar"><i style="width:${pct}%"></i></div><div class="unit-meta"><span>+${u.essence}/sec · Power ${fmt(u.power)}</span><button class="progress-button" data-summon="${u.id}" ${state.essence < cost ? "disabled" : ""}>Summon · ${fmt(cost)}</button></div>` : `<div class="unit-meta"><span>Unlocks through occult knowledge</span><span>LOCKED</span></div>`}</div>`;
  }).join("");
  document.querySelector("#upgrade-list").innerHTML = UPGRADES.map(
    (x) =>
      `<div class="upgrade"><strong>${x.name}</strong><p class="muted">${x.desc}</p><button class="progress-button" data-upgrade="${x.id}" ${has(x.id) || state.essence < x.cost ? "disabled" : ""}>${has(x.id) ? "Acquired" : "Inscribe · " + fmt(x.cost)}</button></div>`,
  ).join("");
}
function update(dt) {
  dt *= state.speed;
  state.runTime += dt;
  let essenceRate =
    (0.4 + UNIT_DEFS.reduce((n, u) => n + state.units[u.id] * u.essence, 0)) *
    mult("essence");
  state.essence += essenceRate * dt;
  state.knowledge += state.units.imp * 0.08 * dt;
  UNIT_DEFS.forEach((u) => {
    if (state.units[u.id] > 0 || (u.id === "spirit" && has("circle"))) {
      state.progress[u.id] += dt * mult("speed");
      if (state.progress[u.id] >= u.time) {
        let count = Math.floor(state.progress[u.id] / u.time);
        state.progress[u.id] %= u.time;
        state.units[u.id] += count;
      }
    }
  });
  if (state.runTime % 15 < dt) save();
}
document.addEventListener("click", (e) => {
  let s = e.target.dataset.summon;
  if (s) {
    let u = UNIT_DEFS.find((x) => x.id === s),
      cost = Math.ceil(u.cost * mult("cost"));
    if (state.essence >= cost) {
      state.essence -= cost;
      state.progress[s] = Math.max(0, state.progress[s]);
      state.units[s]++;
    }
  }
  let up = e.target.dataset.upgrade;
  if (up) {
    let x = UPGRADES.find((y) => y.id === up);
    if (state.essence >= x.cost && !has(up)) {
      state.essence -= x.cost;
      state.upgrades[up] = true;
    }
  }
  if (e.target.id === "conquer") {
    let city = [100, 1000, 10000][state.city] || 100000;
    if (power() >= city) {
      state.city++;
      state.dominion += Math.max(1, Math.floor(power() / city));
      state.essence = 7;
      state.knowledge = 0;
      state.units = Object.fromEntries(UNIT_DEFS.map((u) => [u.id, 0]));
      state.progress = Object.fromEntries(UNIT_DEFS.map((u) => [u.id, 0]));
      save();
      alert("City conquered. Your army has been sacrificed for Dominion.");
    }
  }
  if (
    e.target.id === "reset-save" &&
    confirm("Erase all Progress Demonology progress? This cannot be undone.")
  ) {
    state = fresh();
    save();
  }
  if (e.target.dataset.debug) {
    let d = e.target.dataset.debug;
    if (d === "essence") state.essence += 1000;
    if (d === "knowledge") state.knowledge += 100;
    if (d === "dominion") state.dominion += 10;
    if (d === "speed") state.speed = state.speed === 1 ? 10 : 1;
    if (d === "unlock") UNIT_DEFS.forEach((u) => (state.units[u.id] = 1));
  }
});
let last = performance.now(),
  ui = 0;
function loop(now) {
  let dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  update(dt);
  ui += dt;
  if (ui > 0.08) {
    render();
    ui = 0;
  }
  requestAnimationFrame(loop);
}
render();
requestAnimationFrame(loop);
window.addEventListener("beforeunload", save);
