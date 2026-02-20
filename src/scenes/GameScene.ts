import Phaser from "phaser";
import { addTgDebugText } from "../services/tg";
import { LineDrawer } from "../game/LineDrawer";
import { CatRunner } from "../game/CatRunner";
import { HudUI } from "../game/HudUI";
import { tgHaptic } from "../services/tgHaptics";
import { UIManager } from "../game/UIManager";
import { loadProgress, saveProgress } from "../services/progress";
import { DailyTasks } from "../game/DailyTasks";
import { Lives } from "../game/Lives";
import { getLevel } from "../game/levels/levels";
import type { PlatformRect } from "../game/levels/LevelConfig";
import { HazardSystem } from "../game/HazardSystem";

export class GameScene extends Phaser.Scene {
  private line!: LineDrawer;
  private cat!: CatRunner;
  private hud!: HudUI;
  private ui!: UIManager;

  private ended = false;
  private paused = false;

  private levelId = 1;
  private inkMax = 260;

  private daily = new DailyTasks();
  private lives = new Lives();

  private runStartedAt = 0;
  private catStarted = false; // чтобы не включать рисование после старта кота

  private winDelayMs = 1800;

  private winQueued = false;
  private winShown = false; // вместо _winShown
  private matterWorld?: Phaser.Physics.Matter.World;

  private hazards!: HazardSystem;

  private onCollide = (ev: any) => {
  if (this.ended) return;

  for (const pair of ev.pairs) {
    const a = pair.bodyA;
    const b = pair.bodyB;

    // ✅ 1) LOSE: кот + hazard
    const aIsHazard = this.hazards?.isHazardBody(a);
    const bIsHazard = this.hazards?.isHazardBody(b);

    const isCatHazard =
      (a === this.cat.catBody && bIsHazard) ||
      (b === this.cat.catBody && aIsHazard);

    if (isCatHazard && !this.winQueued) {
      this.endLose();
      return;
    }

    // ✅ 2) WIN: кот + цель (после hazard)
    const isCatGoal =
      (a === this.cat.catBody && b === this.cat.goalBody) ||
      (b === this.cat.catBody && a === this.cat.goalBody);

    if (isCatGoal && !this.winQueued) {
      this.winQueued = true;
      this.line.setEnabled(false);
      this.cat.beginWinSequence(this.winDelayMs, () => this.endWin());
      return;
    }
  }
};


  constructor() {
    super("GameScene");
  }

  create() {
  if (!this.lives.canPlay()) {
    this.scene.start("MenuScene");
    return;
  }

  this.runStartedAt = Date.now();
  this.winQueued = false;
  this.winShown = false;
  this.ended = false;
  this.paused = false;
  this.catStarted = false;

  this.input.setTopOnly(true);

  const w = this.scale.width;
  const h = this.scale.height;

  const lvl = getLevel(this.levelId);

  this.hazards = new HazardSystem(this, {
  enabled: !!lvl.hazard,                 // или lvl.hazard?.enabled
  delayMs: lvl.hazard?.delayMs ?? 2000,
  spawnX: lvl.hazard?.spawnX ?? 0.5,
  spawnY: lvl.hazard?.spawnY ?? -50,
  repeat: lvl.hazard?.repeat ?? false,
  everyMs: lvl.hazard?.everyMs ?? 1500,
  radius: lvl.hazard?.radius ?? 18,
  killBelowY: this.scale.height + 250,
});

  this.inkMax = lvl.inkMax;
  // фон картинкой (если задан)
  if (lvl.visuals.backgroundKey) {
  const bg = this.add.image(
    w / 2,
    h / 2,
    lvl.visuals.backgroundKey
  );

  bg.setDisplaySize(w, h);
  bg.setDepth(-100); // всегда позади всего
} else {
  // fallback на цвет
  this.cameras.main.setBackgroundColor(lvl.visuals.backgroundColor ?? "#000");
}

  //this.cameras.main.setBackgroundColor(lvl.visuals.backgroundColor);

  addTgDebugText(this);

  // UI
  this.ui = new UIManager(this, {
  onModalOpen: () => this.pauseGame(),
  onModalClose: () => this.time.delayedCall(0, () => this.resumeGame()),

  onDebugPrevLevel: () => {
    this.levelId = Math.max(1, this.levelId - 1);
    this.scene.restart();
  },
  onDebugNextLevel: () => {
    this.levelId += 1;
    this.scene.restart();
  },
  onDebugRestartLevel: () => {
    this.scene.restart();
  },
});
this.ui.createDebugBar(this.levelId); // ✅ ВОТ ЭТО ОБЯЗАТЕЛЬНО

  this.refreshHeader();
  this.time.addEvent({ delay: 1000, loop: true, callback: () => this.refreshHeader() });

  // hint
  if (lvl.visuals.hintText) {
    this.add.text(16, 66, lvl.visuals.hintText, { fontSize: "18px", color: "#000" }).setScrollFactor(0);
  }

  // платформы (ТОЛЬКО из конфига)
  for (const p of lvl.platforms) {
  this.spawnPlatform(p);
}

  // системы
  this.hud = new HudUI(this);

  // кот (ОДИН раз)
  this.cat = new CatRunner(this, w, h);  
  this.cat.setGoalPos(lvl.goal.x * w, lvl.goal.y * h);
  this.cat.setCatPos(lvl.start.x * w, lvl.start.y * h);

  // линия
  this.line = new LineDrawer(this, { thickness: 10, minPointDist: 12, inkMax: this.inkMax });
  this.hud.setInkMax(this.inkMax);
  this.line.setInkMax(this.inkMax);
  this.line.setEnabled(true);

  this.line.hookInput(
    () => {
      this.daily.inc("play_5", 1);
      this.catStarted = true;
      this.line.setEnabled(false);
      this.cat.start();
      this.hazards.start();
    },
    () => tgHaptic("light")
  );

  // WIN
   this.matterWorld = this.matter?.world;

  const cleanup = () => {
    this.hazards?.destroy();

    if (this.matterWorld) {
      this.matterWorld.off("collisionstart", this.onCollide);
      this.matterWorld = undefined;
    }
  };

  if (this.matterWorld) {
    this.matterWorld.on("collisionstart", this.onCollide);
  }

  this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
  this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);
}


  update() {
  if (this.paused || this.ended) return;

  this.cat.update();
  this.hud.drawInk(this.line.inkLeft);
  this.line.update();
  this.ui.setInk(this.line.inkLeft);
  this.hazards.update();

  // ✅ проигрыш проверяем только после старта
  if (this.catStarted && this.cat.isFallenBelow(this.scale.height + 200)) {
    this.endLose();
  }
}

  private endWin() {
  if (this.winShown) return;
  this.winShown = true;

  if (this.ended) return; // на всякий
  this.ended = true;

  const used = this.inkMax - this.line.inkLeft;
  const dt = Date.now() - this.runStartedAt;

  // ✅ грузим прогресс ОДИН раз
  const p = loadProgress();

  // --- DAILY (пишем прямо в p) ---
  p.daily.tasks["win_3"] = (p.daily.tasks["win_3"] ?? 0) + 1;

  if (dt <= 20_000)
    p.daily.tasks["fast_win_20"] = (p.daily.tasks["fast_win_20"] ?? 0) + 1;

  if (used <= 150)
    p.daily.tasks["ink_150"] = (p.daily.tasks["ink_150"] ?? 0) + 1;

  if (used <= 120)
    p.daily.tasks["ink_120"] = (p.daily.tasks["ink_120"] ?? 0) + 1;

  // --- STREAK ---
  p.streak.wins = (p.streak.wins ?? 0) + 1;
  p.streak.noFail = (p.streak.noFail ?? 0) + 1;

  // ✅ важный момент:
  // если ты сделал goal=1 (выполнено/не выполнено) — то ставь 1
  if (p.streak.wins >= 2) p.daily.tasks["streak_2"] = 1;
  if (p.streak.noFail >= 2) p.daily.tasks["no_fail_2"] = 1;

  // --- награда за победу ---
  const ratio = used / this.inkMax;
  const stars = ratio <= 0.4 ? 3 : ratio <= 0.7 ? 2 : 1;

  const prevStars = p.bestStarsByLevel[this.levelId] ?? 0;
  if (stars > prevStars) p.bestStarsByLevel[this.levelId] = stars;

  const reward = stars === 3 ? 20 : stars === 2 ? 12 : 6;
  p.coins += reward;

  // ✅ сохраняем ОДИН раз
  saveProgress(p);

  // UI
  this.ui.setWinInfo({ stars, reward });
  this.ui.showWin(() => this.scene.restart());
  tgHaptic("success");
}

  private endLose() {
    if (this.ended) return;
    this.ended = true;

    this.line.setEnabled(false);

    // сброс серий в progress
    const p = loadProgress();
    p.streak.wins = 0;
    p.streak.noFail = 0;
    saveProgress(p);

    // ✅ тратим жизнь ТОЛЬКО тут
  const ok = this.lives.consumeOne();

    if (!ok) {
    // жизней нет -> в меню
    this.ui.showLose(() => this.scene.start("MenuScene"));
  } else {
    // жизнь есть -> быстрая попытка
    this.ui.showLose(() => this.scene.restart());
  }

  tgHaptic("error");
  }

  private pauseGame() {
    this.paused = true;
    this.matter.world.pause();
    this.line.setEnabled(false);
  }

  private resumeGame() {
    if (this.ended) return;

    this.paused = false;
    this.matter.world.resume();

    // рисование разрешаем только если кот ещё НЕ стартовал
    if (!this.catStarted) this.line.setEnabled(true);
  }
  private refreshHeader() {
  const p = loadProgress();
  const st = this.lives.getState();
  this.ui.setHeader({
    coins: p.coins,
    lives: `${st.count}/${st.max}`,
    regenAt: st.nextRegenAt,
  });
}
private spawnPlatform(p: PlatformRect) {
  const w = this.scale.width;
  const h = this.scale.height;

  const px = p.x * w;
  const py = p.y * h;
  const pw = p.w * w;
  const ph = p.h;

  // 1️⃣ Физика
  const body = this.matter.add.rectangle(px, py, pw, ph, {
    isStatic: true,
    angle: p.angle ?? 0,
  });

  // 2️⃣ Визуал
  if (p.visual) {
    if (p.visual.mode === "tile") {
      const tile = this.add.tileSprite(px, py, pw, ph, p.visual.key);
      tile.setRotation(p.angle ?? 0);
      tile.setDepth(p.visual.depth ?? 0);

      const s = p.visual.tileScale ?? 1;
      tile.tileScaleX = s;
      tile.tileScaleY = s;
    } else {
      const img = this.add.image(px, py, p.visual.key);
      img.setDisplaySize(pw, ph);
      img.setRotation(p.angle ?? 0);
      img.setDepth(p.visual.depth ?? 0);
    }
  }

  return body;
}
}