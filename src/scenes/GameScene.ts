import Phaser from "phaser";
import { addTgDebugText } from "../services/tg";
import { LineDrawer } from "../game/LineDrawer";
import { CatRunner } from "../game/CatRunner";
import { HudUI } from "../game/HudUI";
import { tgHaptic } from "../services/tgHaptics";
import { UIManager } from "../game/UIManager";


export class GameScene extends Phaser.Scene {
  private line!: LineDrawer;
  private cat!: CatRunner;
  private hud!: HudUI;
  private ui!: UIManager;
  private ended = false;
  private paused = false;
  

  constructor() {
    super("GameScene");
  }

  create() {
  this.ended = false;
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
  this.line = new LineDrawer(this, { thickness: 10, minPointDist: 12, inkMax: 260 });
  this.line.setInkMax(260);
  this.hud.setInkMax(260);
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

  this.cat.stop();          // если ты добавил stop()
  this.line.setEnabled(false);

  this.ui.showWin(() => this.scene.restart());
  tgHaptic("success");
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