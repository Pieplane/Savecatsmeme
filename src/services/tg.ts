import Phaser from "phaser";

export type TgInfo = {
  connected: boolean;
  userName: string;
  userId: string;
  platform: string;
  theme: string;
};

export function getTgWebApp(): any | null {
  return (window as any).Telegram?.WebApp ?? null;
}

export function readTgInfo(): TgInfo {
  const tg = getTgWebApp();
  if (!tg) {
    return { connected: false, userName: "unknown", userId: "none", platform: "web", theme: "light" };
  }

  const user = tg.initDataUnsafe?.user;
  return {
    connected: true,
    userName: user?.first_name ?? "unknown",
    userId: String(user?.id ?? "none"),
    platform: tg.platform ?? "unknown",
    theme: tg.colorScheme ?? "unknown",
  };
}

export function addTgDebugText(scene: Phaser.Scene, x = 16, y = 160) {
  const info = readTgInfo();
  if (!info.connected) return;

  scene.add.text(
    x,
    y,
    [
      "TG CONNECTED",
      `User: ${info.userName}`,
      `ID: ${info.userId}`,
      `Platform: ${info.platform}`,
      `Theme: ${info.theme}`,
    ].join("\n"),
    { fontSize: "14px", color: "#000" }
  ).setScrollFactor(0);
}