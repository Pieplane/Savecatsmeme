import Phaser from "phaser";

export class CatRunner {
  private scene: Phaser.Scene;

  public catBody: MatterJS.BodyType;
  public goalBody: MatterJS.BodyType;

  public catGO: Phaser.GameObjects.Arc;
  public goalGO: Phaser.GameObjects.Rectangle;

  private running = false;
  private targetSpeedX = 2.2;

  constructor(scene: Phaser.Scene, w: number, h: number) {
    this.scene = scene;
    const matter = (scene as any).matter as Phaser.Physics.Matter.MatterPhysics;

    this.catBody = matter.add.circle(w * 0.15, h - 140, 18, {
      friction: 0.01,
      frictionAir: 0.01,
      restitution: 0,
    });

    // не спать
    matter.body.set(this.catBody, { sleepThreshold: -1 });

    this.goalBody = matter.add.rectangle(w * 0.88, h - 180, 60, 60, {
      isStatic: true,
      isSensor: true,
    });

    this.catGO = scene.add.circle((this.catBody as any).position.x, (this.catBody as any).position.y, 18, 0xffffff);
    this.goalGO = scene.add.rectangle((this.goalBody as any).position.x, (this.goalBody as any).position.y, 60, 60, 0xffffff);
  }

  start() {
    this.running = true;
    const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics;
    matter.body.setVelocity(this.catBody, { x: this.targetSpeedX, y: 0 });
  }

  stop() {
  const Body = (Phaser.Physics.Matter as any).Matter.Body;

  Body.setVelocity(this.catBody, { x: 0, y: 0 });
  Body.setAngularVelocity(this.catBody, 0);
  Body.setStatic(this.catBody, true); // полностью замораживаем
}

  update() {
    const matter = (this.scene as any).matter as Phaser.Physics.Matter.MatterPhysics;

    if (this.running) {
      const v = (this.catBody as any).velocity;
      if (v.x < this.targetSpeedX) {
        matter.body.setVelocity(this.catBody, { x: this.targetSpeedX, y: v.y });
      }
    }

    const cp = (this.catBody as any).position;
    this.catGO.setPosition(cp.x, cp.y);
    this.catGO.setRotation((this.catBody as any).angle);

    const gp = (this.goalBody as any).position;
    this.goalGO.setPosition(gp.x, gp.y);
  }

  isFallenBelow(y: number) {
    const pos = (this.catBody as any).position;
    return pos && pos.y > y;
  }
  
}