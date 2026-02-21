import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"], // выносим Phaser в отдельный чанк
        },
      },
    },
    chunkSizeWarningLimit: 1500, // чтобы убрать предупреждение
  },
});