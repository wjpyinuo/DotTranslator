import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import electronRenderer from 'vite-plugin-electron-renderer';
import path from 'path';
import fs from 'fs';

// 复制辅助窗口 HTML 到 dist-electron
function copyAuxWindows() {
  const src = path.resolve(__dirname, 'electron/aux-windows');
  const dest = path.resolve(__dirname, 'dist-electron/aux-windows');
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    fs.copyFileSync(path.join(src, file), path.join(dest, file));
  }
}

// Vite 插件：构建后复制辅助窗口文件
function copyAuxPlugin() {
  return {
    name: 'copy-aux-windows',
    closeBundle() {
      copyAuxWindows();
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(args) {
          copyAuxWindows();
          args.startup();
        },
        vite: {
          resolve: {
            alias: {
              '@': path.resolve(__dirname, 'src'),
              '@shared': path.resolve(__dirname, 'src/shared'),
              '@main': path.resolve(__dirname, 'src/main'),
              '@workers': path.resolve(__dirname, 'src/workers'),
            },
          },
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['better-sqlite3'],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(args) {
          args.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
    ]),
    electronRenderer(),
    copyAuxPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@workers': path.resolve(__dirname, 'src/workers'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-zustand': ['zustand'],
          'vendor-immer': ['immer'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
