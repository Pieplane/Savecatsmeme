import Phaser from "phaser";

export type Vec2 = { x: number; y: number };

export type LineDrawerConfig = {
  thickness: number;
  minPointDist: number;
  inkMax: number;
};

export class LineDrawer {
  public inkLeft: number;

  private scene: Phaser.Scene;
  private g: Phaser.GameObjects.Graphics;

  private drawing = false;
  private points: Vec2[] = [];
  private lineBodies: MatterJS.BodyType[] = [];

  private cfg: LineDrawerConfig;

  constructor(scene: Phaser.Scene, cfg: LineDrawerConfig) {
    this.scene = scene;
    this.cfg = cfg;
    this.inkLeft = cfg.inkMax;
    this.g = scene.add.graphics();
  }

  /** подключить инпут */
  hookInput(onLineFinalized: () => void) {
    this.scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      this.drawing = true;
      this.points = [];
      this.inkLeft = this.cfg.inkMax;

      this.points.push({ x: p.worldX, y: p.worldY });
      this.redraw();
    });

    this.scene.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.drawing) return;

      const cur = { x: p.worldX, y: p.worldY };
      const last = this.points[this.points.length - 1];

      const d = Phaser.Math.Distance.Between(cur.x, cur.y, last.x, last.y);
      if (d < this.cfg.minPointDist) return;
      if (this.inkLeft <= 0) return;

      const take = Math.min(d, this.inkLeft);
      if (take <= 0) return;

      if (take < d) {
        const t = take / d;
        cur.x = last.x + (cur.x - last.x) * t;
        cur.y = last.y + (cur.y - last.y) * t;
      }

      this.points.push(cur);
      this.inkLeft -= take;
      this.redraw();
    });

    this.scene.input.on("pointerup", () => {
      if (!this.drawing) return;
      this.drawing = false;

      this.buildPhysicsLine();
      onLineFinalized();
    });
  }

  setInkMax(v: number) {
    this.cfg.inkMax = v;
    this.inkLeft = v;
  }

  clear() {
    this.g.clear();
    this.points = [];
    this.clearBodies();
  }

  private clearBodies() {
    const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics;
    for (const b of this.lineBodies) matter.world.remove(b);
    this.lineBodies = [];
  }

  private redraw() {
    this.g.clear();
    this.g.lineStyle(this.cfg.thickness, 0xffffff, 1);

    if (this.points.length >= 2) {
      this.g.beginPath();
      this.g.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        this.g.lineTo(this.points[i].x, this.points[i].y);
      }
      this.g.strokePath();
    }
  }

  private buildPhysicsLine() {
    this.clearBodies();
    if (this.points.length < 2) return;

    const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics;

    for (let i = 0; i < this.points.length - 1; i++) {
      const a = this.points[i];
      const b = this.points[i + 1];

      const len = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      if (len < 4) continue;

      const angle = Phaser.Math.Angle.Between(a.x, a.y, b.x, b.y);
      const cx = (a.x + b.x) * 0.5;
      const cy = (a.y + b.y) * 0.5;

      const body = matter.add.rectangle(cx, cy, len, this.cfg.thickness, {
        isStatic: true,
        angle,
        friction: 0.9,
        restitution: 0,
      });

      this.lineBodies.push(body);
    }
  }
}