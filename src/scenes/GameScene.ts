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
import { SeesawLauncher } from "../game/SeesawLauncher";

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
  private winTimer?: Phaser.Time.TimerEvent;
private surviveMs = 0;

private seesaw?: SeesawLauncher;

private loseNoWinTimer?: Phaser.Time.TimerEvent;


private winType: "reachGoal" | "survive" | "enterTrigger" = "reachGoal";
private winTriggerId = "goal"; // для enterTrigger

private loseNoWinAfterMs = 0;  // если >0 и win не случился -> проигрыш
private fellBelowY = 0;

private loseNoWinDeadline = 0;
private surviveDeadline = 0;

private loseStuckMs = 0;
private loseMinMovePx = 8;

private stuckCheckTimer?: Phaser.Time.TimerEvent;
private stuckAccumMs = 0;

private stuckWindowMs = 800; // окно проверки
private stuckWindowStartAt = 0;
private stuckWindowStartPos?: { x: number; y: number };

private movementMode: "walk" | "launch" = "walk";

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
    // качеля: если линия ударила сенсор — обработали и выходим
if (this.seesaw?.handleCollision(a, b)) {
  // можно сделать лёгкую вибрацию
  tgHaptic("light");
  continue;
}



    // ✅ 2) WIN: кот + цель (после hazard)
    if (this.winType === "enterTrigger") {
  const isTrigger = (body: MatterJS.BodyType) =>
    !!body.isSensor && body.label === `trigger:${this.winTriggerId}`;

  const isCatTrigger =
    (a === this.cat.catBody && isTrigger(b)) ||
    (b === this.cat.catBody && isTrigger(a));

  if (isCatTrigger && !this.winQueued) {
    this.winQueued = true;
    this.line.setEnabled(false);
    this.cat.beginWinSequence(this.winDelayMs, () => this.endWin());
    return;
  }
}

// WIN: reachGoal
if (this.winType === "reachGoal") {
  const isCatGoal =
    (a === this.cat.catBody && b === this.cat.goalTriggerBody) ||
    (b === this.cat.catBody && a === this.cat.goalTriggerBody);

  if (isCatGoal && !this.winQueued) {
    this.winQueued = true;
    this.line.setEnabled(false);
    this.cat.beginWinSequence(this.winDelayMs, () => this.endWin());
    return;
  }
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
  this.movementMode = lvl.movement?.mode ?? "walk";

const win = lvl.win;
this.winType = win?.type ?? "reachGoal";
this.winTriggerId = (win?.type === "enterTrigger") ? win.triggerId : "goal";
this.surviveMs = (win?.type === "survive") ? win.ms : 0;

const lose = lvl.lose;
this.loseNoWinAfterMs = lose?.noWinAfterMs ?? 0;
this.loseStuckMs = lose?.stuckMs ?? 0;
this.loseMinMovePx = lose?.minMovePx ?? 8;

const fellBelow = lvl.lose?.fellBelowY;
this.fellBelowY = fellBelow ?? (this.scale.height + 200);

// почистим таймер на всякий
this.winTimer?.remove(false);
this.winTimer = undefined;

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
  this.cat.setGoalTriggerId(this.winType === "enterTrigger" ? this.winTriggerId : "goal");
  this.cat.setPreDrawGlide(true);
  // подключаем эффект
this.cat.setOnGlideFx(() => {
  tgHaptic("light");
  // если хочешь звук:
  // this.sound.play("glide", { volume: 0.2 });
});

const sw = lvl.seesaw;

if (sw?.enabled) {
  this.seesaw = new SeesawLauncher(this, this.cat.catBody, this.cat.goalBody, {
    width: sw.width ?? 240,
    height: sw.height ?? 18,
    upVelocity: sw.upVelocity ?? 18,
    flightTime: sw.flightTime ?? 0.95,
    cooldownMs: sw.cooldownMs ?? 700,
  });

  this.seesaw.setPosition(this.scale.width * sw.x, this.scale.height * sw.y);
} else {
  this.seesaw = undefined;
}

  // линия
  this.line = new LineDrawer(this, { thickness: 10, minPointDist: 12, inkMax: this.inkMax });
  this.hud.setInkMax(this.inkMax);
  this.line.setInkMax(this.inkMax);
  this.line.setEnabled(true);

  this.line.hookInput(
    () => {
      this.daily.inc("play_5", 1);
      this.cat.setPreDrawGlide(false); // ✅ отключили навсегда для уровня
      this.catStarted = true;
      this.startStuckDetection();
      this.line.setEnabled(false);
      //this.cat.start();
      if (this.movementMode === "walk") {
      this.cat.start();
      } else {
      this.cat.stop();
}
      this.hazards.start();

      if (this.loseNoWinAfterMs > 0&& this.loseStuckMs <= 0) {
  this.loseNoWinDeadline = Date.now() + this.loseNoWinAfterMs;

  this.loseNoWinTimer?.remove(false);
  this.loseNoWinTimer = this.time.delayedCall(this.loseNoWinAfterMs, () => {
    if (this.ended || this.winQueued) return;
    this.endLose();
  });
} else {
  this.loseNoWinDeadline = 0;
}
      // ✅ если уровень "survive" — ставим таймер победы
if (this.winType === "survive" && this.surviveMs > 0) {
  this.surviveDeadline = Date.now() + this.surviveMs;

  this.winTimer?.remove(false);
  this.winTimer = this.time.delayedCall(this.surviveMs, () => {
    if (this.ended || this.winQueued) return;
    this.winQueued = true;
    this.line.setEnabled(false);
    this.cat.beginWinSequence(0, () => this.endWin());
  });
} else {
  this.surviveDeadline = 0;
}
    },
    () => tgHaptic("light")
  );

  // WIN
   this.matterWorld = this.matter?.world;

  const cleanup = () => {
    this.hazards?.destroy();
    this.winTimer?.remove(false);
this.winTimer = undefined;
this.stopStuckDetection();

    if (this.matterWorld) {
      this.matterWorld.off("collisionstart", this.onCollide);
      this.matterWorld = undefined;
    }

    this.loseNoWinTimer?.remove(false);
this.loseNoWinTimer = undefined;


this.loseNoWinDeadline = 0;
this.surviveDeadline = 0;
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
  this.seesaw?.update();

  // ✅ проигрыш проверяем только после старта
  if (this.catStarted && this.cat.isFallenBelow(this.fellBelowY)) {
    this.endLose();
  }
  if (this.ui) this.updateDebugTimersUI();
}

  private endWin() {
  if (this.winShown) return;
  this.winShown = true;

  if (this.ended) return; // на всякий
  this.ended = true;
  this.stopStuckDetection();

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

  this.loseNoWinTimer?.remove(false);
this.loseNoWinTimer = undefined;


this.loseNoWinDeadline = 0;
this.surviveDeadline = 0;
}

  private endLose() {
    if (this.ended) return;
    this.ended = true;

    this.line.setEnabled(false);
    this.winTimer?.remove(false);
this.winTimer = undefined;
this.stopStuckDetection();

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
  this.loseNoWinTimer?.remove(false);
this.loseNoWinTimer = undefined;


this.loseNoWinDeadline = 0;
this.surviveDeadline = 0;
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
private updateDebugTimersUI() {
  // показываем только если debug включен (если хочешь — сделай флаг)
  const now = Date.now();

  const lines: string[] = [];

  if (this.loseNoWinDeadline > 0) {
    const left = Math.max(0, this.loseNoWinDeadline - now);
    lines.push(`LOSE in: ${(left / 1000).toFixed(2)}s`);
  } else {
    lines.push(`LOSE in: -`);
  }

  if (this.surviveDeadline > 0) {
    const left = Math.max(0, this.surviveDeadline - now);
    lines.push(`SURVIVE left: ${(left / 1000).toFixed(2)}s`);
  } else {
    lines.push(`SURVIVE left: -`);
  }

  lines.push(`winType: ${this.winType}`);
  lines.push(`catStarted: ${this.catStarted ? "yes" : "no"}`);

  this.ui.setDebugTimers(lines);
}
private startStuckDetection() {
  if (this.loseStuckMs <= 0) return;

  this.stopStuckDetection();

  this.stuckAccumMs = 0;
  this.stuckWindowMs = 800; // можно вынести в конфиг, но пока ок

  const p = (this.cat.catBody as any).position;
  this.stuckWindowStartAt = Date.now();
  this.stuckWindowStartPos = p ? { x: p.x, y: p.y } : undefined;

  const tickMs = 200;

  this.stuckCheckTimer = this.time.addEvent({
    delay: tickMs,
    loop: true,
    callback: () => {
      if (this.ended || !this.catStarted) return;

      const body: any = this.cat.catBody;
      const pos = body.position;
      if (!pos || !this.stuckWindowStartPos) return;

      const now = Date.now();
      const dt = now - this.stuckWindowStartAt;

      // ждём пока окно накопится
      if (dt < this.stuckWindowMs) return;

      const dx = pos.x - this.stuckWindowStartPos.x;
      const dy = pos.y - this.stuckWindowStartPos.y;
      const moved = Math.sqrt(dx * dx + dy * dy);

      const stuckThisWindow = moved < this.loseMinMovePx;

      if (stuckThisWindow) {
        this.stuckAccumMs += this.stuckWindowMs;
        if (this.stuckAccumMs >= this.loseStuckMs) {
          this.endLose();
          return;
        }
      } else {
        this.stuckAccumMs = 0;
      }

      // начинаем новое окно с текущей позиции
      this.stuckWindowStartAt = now;
      this.stuckWindowStartPos = { x: pos.x, y: pos.y };
    },
  });
}

private stopStuckDetection() {
  this.stuckCheckTimer?.remove(false);
  this.stuckCheckTimer = undefined;
  this.stuckAccumMs = 0;
  this.stuckWindowStartAt = 0;
  this.stuckWindowStartPos = undefined;
}
}