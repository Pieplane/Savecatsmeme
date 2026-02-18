import Phaser from "phaser";

export class HudUI {
  private g: Phaser.GameObjects.Graphics;
  private inkMax = 1;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics();
  }

  setInkMax(v: number) {
    this.inkMax = Math.max(1, v);
  }

  drawInk(inkLeft: number) {
    this.g.clear();
    this.g.fillStyle(0xffffff, 0.2);
    this.g.fillRect(16, 46, 200, 10);
    this.g.fillStyle(0xffffff, 0.8);
    this.g.fillRect(16, 46, 200 * (inkLeft / this.inkMax), 10);
  }
}