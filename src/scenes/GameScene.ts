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


  constructor() {
    super("GameScene");
  }

  create() {
    if (!this.lives.canPlay()) {
    this.scene.start("MenuScene");
    return;
  }

    this.runStartedAt = Date.now();
    this.ended = false;
    this.paused = false;
    this.catStarted = false;


    this.cameras.main.setBackgroundColor("#5abcd4");
    this.input.setTopOnly(true);

    const w = this.scale.width;
    const h = this.scale.height;

    // мир
    this.matter.add.rectangle(w / 2, h - 40, w, 80, { isStatic: true });
    this.matter.add.rectangle(w * 0.22, h - 80, w * 0.35, 20, { isStatic: true });
    this.matter.add.rectangle(w * 0.78, h - 140, w * 0.35, 20, { isStatic: true });

    addTgDebugText(this);
    // UI
    this.ui = new UIManager(this, {
  onModalOpen: () => this.pauseGame(),
  onModalClose: () => this.time.delayedCall(0, () => this.resumeGame()),
});
    this.refreshHeader();

// чтобы жизни “тикали” когда идёт восстановление
this.time.addEvent({
  delay: 1000,
  loop: true,
  callback: () => this.refreshHeader(),
});

    this.add
      .text(16, 66, "Нарисуй мост. Отпусти палец — кот пойдет.", {
        fontSize: "18px",
        color: "#000",
      })
      .setScrollFactor(0);

    // системы
    this.hud = new HudUI(this);
    this.cat = new CatRunner(this, w, h);

    // линия
    this.line = new LineDrawer(this, { thickness: 10, minPointDist: 12, inkMax: this.inkMax });
    this.line.setInkMax(this.inkMax);
    this.hud.setInkMax(this.inkMax);
    this.line.setEnabled(true);

    this.line.hookInput(
      () => {
        // ✅ попытка засчитывается только когда игрок реально отпустил линию и запустил кота
    this.daily.inc("play_5", 1);
        // старт кота = дальше рисование запрещаем
        this.catStarted = true;
        this.line.setEnabled(false);
        this.cat.start();
      },
      () => tgHaptic("light")
    );

    

    // WIN
    this.matter.world.on("collisionstart", (ev: any) => {
      if (this.ended) return;

      for (const pair of ev.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;

        if (
          (a === this.cat.catBody && b === this.cat.goalBody) ||
          (b === this.cat.catBody && a === this.cat.goalBody)
        ) {
          this.endWin();
          return;
        }
      }
    });
  }

  update() {
  if (this.paused || this.ended) return;

  this.cat.update();
  this.hud.drawInk(this.line.inkLeft);
  this.line.update();
  this.ui.setInk(this.line.inkLeft);

  // ✅ проигрыш проверяем только после старта
  if (this.catStarted && this.cat.isFallenBelow(this.scale.height + 200)) {
    this.endLose();
  }
}

  private endWin() {
  if (this.ended) return;
  this.ended = true;

  this.cat.stop();
  this.line.setEnabled(false);

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
}