import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    // Глобальные ассеты игры
    this.load.image("grass_mid", "assets/platforms/GrassMid.png");
    this.load.image("plat_stone", "assets/platforms/stone.png");
    this.load.image("plat_ice", "assets/platforms/ice.png");

    this.load.spritesheet("cat_run", "assets/cat/cat_run.png", {
  frameWidth: 498,
  frameHeight: 486,
});
this.load.spritesheet("goal_anim", "assets/goal/goal_anim.png", {
  frameWidth: 200,
  frameHeight: 200,
});

    this.load.image("bg_game", "assets/bg_game.png");
  }

  create() {
    this.anims.create({
      key: "cat-run",
      frames: this.anims.generateFrameNumbers("cat_run", { start: 0, end: 120 }),
      frameRate: 12,
      repeat: -1,
    });
    this.anims.create({
      key: "goal-loop",
      frames: this.anims.generateFrameNumbers("goal_anim", { start: 0, end: 7 }),
      frameRate: 12,
      repeat: -1,
    });
    // после загрузки идём в меню
    this.scene.start("MenuScene"); 
    // или сразу в GameScene для тестов
    // this.scene.start("GameScene");
    
  }
}