import type { LevelConfig } from "./LevelConfig";

export const LEVELS: Record<number, LevelConfig> = {
  1: {
    id: 1,
    inkMax: 860,
    visuals: {
      backgroundKey: "bg_game",
      hintText: "Нарисуй мост. Отпусти палец — кот пойдет.",
    },
    platforms: [
      { x: 0.150, y: 0.70, w: 0.300, h: 128, visual: { key: "grass_mid", mode: "tile" } },  // земля
      { x: 0.150, y: 0.80, w: 0.300, h: 128, visual: { key: "dirt", mode: "tile" } },  // земля

      { x: 0.850, y: 0.70, w: 0.300, h: 128, visual: { key: "grass_mid", mode: "tile" } },  // земля
      { x: 0.850, y: 0.80, w: 0.300, h: 128, visual: { key: "dirt", mode: "tile" } },  // земля
    ],

    start: { x: 0.15, y: 0.65 },
    goal: { x: 0.85, y: 0.60 },
    

    movement: { mode: "walk" },
    win: { type: "enterTrigger", triggerId: "goal" },
    lose: { noWinAfterMs: 0, stuckMs: 2500, minMovePx: 6, fellBelowY: 1500 },
  },

  2: {
    id: 2,
    inkMax: 900,
    visuals: { backgroundKey: "bg_game" },
    platforms: [
      { x: 0.5, y: 0.70, w: 1, h: 128, visual: { key: "grass_mid", mode: "tile" } },  // земля
      { x: 0.5, y: 0.80, w: 1, h: 128, visual: { key: "dirt", mode: "tile" } },  // земля
    ],

    start: { x: 0.40, y: 0.65 },
    goal: { x: 0.65, y: 0.60 },
    
    hazard: {
    delayMs: 2000,
    spawnX: 0.5,
    spawnY: -50,
    repeat: false,
    everyMs: 1500,
    radius: 48,
  },
    movement: { mode: "launch" },
    win: { type: "survive", ms: 5000 },
  },
  3: {
    id: 3,
    inkMax: 860,
    visuals: {
      backgroundKey: "bg_game",
      hintText: "Нарисуй мост. Отпусти палец — кот пойдет.",
    },
    platforms: [
      { x: 0.150, y: 0.70, w: 0.300, h: 128, visual: { key: "grass_mid", mode: "tile" } },  // земля
      { x: 0.150, y: 0.80, w: 0.300, h: 128, visual: { key: "dirt", mode: "tile" } },  // земля

      { x: 0.850, y: 0.40, w: 0.300, h: 128, visual: { key: "grass_mid", mode: "tile" } },  // земля
      { x: 0.850, y: 0.50, w: 0.300, h: 128, visual: { key: "dirt", mode: "tile" } },  // земля
    ],

    start: { x: 0.15, y: 0.65 },
    goal: { x: 0.85, y: 0.30 },
    

    movement: { mode: "walk" },
    win: { type: "enterTrigger", triggerId: "goal" },
    lose: { noWinAfterMs: 0, stuckMs: 2500, minMovePx: 6, fellBelowY: 1500 },
  },
  4: {
    id: 4,
    inkMax: 860,
    visuals: {
      backgroundKey: "bg_game",
      hintText: "Нарисуй мост. Отпусти палец — кот пойдет.",
    },
    platforms: [
      { x: 0.100, y: 0.70, w: 0.200, h: 128, visual: { key: "grass_mid", mode: "tile" } },  // земля
      { x: 0.100, y: 0.80, w: 0.200, h: 128, visual: { key: "dirt", mode: "tile" } },  // земля

      { x: 0.850, y: 0.70, w: 0.300, h: 128, visual: { key: "grass_mid", mode: "tile" } },  // земля
      { x: 0.850, y: 0.80, w: 0.300, h: 128, visual: { key: "dirt", mode: "tile" } },  // земля
    ],

    start: { x: 0.25, y: 0.45 },
    goal: { x: 0.85, y: 0.60 },
    

    movement: { mode: "walk" },
    win: { type: "enterTrigger", triggerId: "goal" },
    lose: { noWinAfterMs: 0, stuckMs: 2500, minMovePx: 6, fellBelowY: 1500 },
  },
  5: {
    id: 5,
    inkMax: 860,
    visuals: {
      backgroundKey: "bg_game",
      hintText: "Нарисуй мост. Отпусти палец — кот пойдет.",
    },
    platforms: [
      { x: 0.250, y: 0.70, w: 0.5, h: 128, visual: { key: "grass_mid", mode: "tile" } },  // земля
      { x: 0.250, y: 0.80, w: 0.5, h: 128, visual: { key: "dirt_down", mode: "tile" } },  // земля

      { x: 0.750, y: 0.60, w: 0.5, h: 128, visual: { key: "grass_mid", mode: "tile" } },  // земля
      { x: 0.750, y: 0.70, w: 0.5, h: 128, visual: { key: "dirt", mode: "tile" } },  // земля
      { x: 0.750, y: 0.80, w: 0.5, h: 128, visual: { key: "dirt_down", mode: "tile" } },  // земля
    ],

    start: { x: 0.15, y: 0.6 },
    goal: { x: 0.85, y: 0.50 },
    
  seesaw: {
  enabled: true,
  x: 0.25,
  y: 0.62,
  width: 240,
  height: 18,
  upVelocity: 28,
  flightTime: 0.95,
  cooldownMs: 700,
},

    movement: { mode: "launch" },
    win: { type: "enterTrigger", triggerId: "goal" },
    lose: { noWinAfterMs: 0, stuckMs: 2500, minMovePx: 6, fellBelowY: 1500 },
  },
};

export function getLevel(id: number): LevelConfig {
  return LEVELS[id] ?? LEVELS[1];
}