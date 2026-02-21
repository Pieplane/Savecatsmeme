import Phaser from "phaser";
import { BootScene } from "./game/BootScene";
import { MenuScene } from "./scenes/MenuScene";
import { GameScene } from "./scenes/GameScene";

function initTelegram() {
  const tg = (window as any).Telegram?.WebApp;
  if (!tg) return;

  tg.ready();
  // tg.expand();
  // tg.disableVerticalSwipes?.();
}

initTelegram();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#000000ff",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  physics: {
    default: "matter",
    matter: {
      gravity: { x: 0, y: 1.2 },
      debug: true,
    },
  },
  scene: [BootScene, MenuScene, GameScene], // ← сначала меню
});