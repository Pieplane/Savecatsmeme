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
  

  constructor() {
    super("GameScene");
  }

  create() {
    if (!this.lives.consumeOne()) {
  // нет жизней → назад в меню
  this.scene.start("MenuScene");
  return;
}

  this.ended = false;

  this.daily.inc("play_5", 1);
  this.cameras.main.setBackgroundColor("#5abcd4");
  this.input.setTopOnly(true);

  const w = this.scale.width;
  const h = this.scale.height;

  // мир
  this.matter.add.rectangle(w / 2, h - 40, w, 80, { isStatic: true });
  this.matter.add.rectangle(w * 0.22, h - 80, w * 0.35, 20, { isStatic: true });
  this.matter.add.rectangle(w * 0.78, h - 140, w * 0.35, 20, { isStatic: true });

  addTgDebugText(this);

  this.add.text(16, 66, "Нарисуй мост. Отпусти палец — кот пойдет.", {
    fontSize: "18px",
    color: "#000",
  }).setScrollFactor(0);

  // системы
  this.hud = new HudUI(this);
  this.cat = new CatRunner(this, w, h);

  // линия
  this.line = new LineDrawer(this, { thickness: 10, minPointDist: 12, inkMax: this.inkMax });
  this.line.setInkMax(this.inkMax);
  this.hud.setInkMax(this.inkMax);
  this.line.setEnabled(true);

  this.line.hookInput(
    () => this.cat.start(),
    () => tgHaptic("light")
  );

  // UI (после line)
  this.ui = new UIManager(this, {
  onModalOpen: () => this.pauseGame(),
  onModalClose: () =>
    this.time.delayedCall(0, () => this.resumeGame()),
});

  // win
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

    if (!this.ended && this.cat.isFallenBelow(this.scale.height + 200)) {
  this.endLose();
}
  }

  private endWin() {
  if (this.ended) return;
  this.ended = true;

  this.cat.stop();
  this.line.setEnabled(false);

  // ⭐ stars
  this.daily.inc("win_3", 1);
  const used = this.inkMax - this.line.inkLeft;
  if (used <= 150) this.daily.inc("ink_150", 1);
  const ratio = used / this.inkMax;
  const stars = ratio <= 0.4 ? 3 : ratio <= 0.7 ? 2 : 1;

  const p = loadProgress();
  const prev = p.bestStarsByLevel[this.levelId] ?? 0;
  if (stars > prev) p.bestStarsByLevel[this.levelId] = stars;

  // награда монетами (пример)
  const reward = stars === 3 ? 20 : stars === 2 ? 12 : 6;
  p.coins += reward;
  saveProgress(p);

  
  this.ui.showWin(() => this.scene.restart()); // лучше модалкой
  this.ui.setWinInfo({ stars, reward });       // добавим чуть позже в UIManager
  tgHaptic("success");

  //this.time.delayedCall(700, () => this.scene.restart());
}

private endLose() {
  if (this.ended) return;
  this.ended = true;

  this.line.setEnabled(false);

  this.ui.showLose(() => this.scene.restart());
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
  this.line.setEnabled(true);
}
}