import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    // Глобальные ассеты игры
    this.load.image("grass_mid", "assets/platforms/GrassMid.png");
    this.load.image("dirt_down", "assets/platforms/DirtDown.png");
    this.load.image("dirt", "assets/platforms/Dirt.png");

    this.load.spritesheet("cat_run", "assets/cat/cat_run.png", {
  frameWidth: 498,
  frameHeight: 486,
});
this.load.spritesheet("goal_anim", "assets/goal/goal_anim.png", {
  frameWidth: 200,
  frameHeight: 200,
});
this.load.spritesheet("goal_win", "assets/goal/goal_win.png", {
  frameWidth: 637,
  frameHeight: 358,
});

    this.load.image("bg_game", "assets/bg_game.png");
  }

  create() {
    this.anims.create({
      key: "cat-run",
      frames: this.anims.generateFrameNumbers("cat_run", { start: 0, end: 119 }),
      frameRate: 12,
      repeat: -1,
    });
    this.anims.create({
      key: "goal-loop",
      frames: this.anims.generateFrameNumbers("goal_anim", { start: 0, end: 49 }),
      frameRate: 12,
      repeat: -1,
    });
    // пример: победная анимация цели (может быть другой sheet: goal_win)
this.anims.create({
  key: "goal-win",
  frames: this.anims.generateFrameNumbers("goal_win", { start: 0, end: 13 }),
  frameRate: 14,
  repeat: 0, // один раз
});
    // после загрузки идём в меню
    this.scene.start("MenuScene"); 
    // или сразу в GameScene для тестов
    // this.scene.start("GameScene");
    
  }
}