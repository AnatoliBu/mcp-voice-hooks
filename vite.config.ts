import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';

export default defineConfig({
  plugins: [
    electron([
      {
        // Main process entry point
        entry: 'electron/main/index.ts',
        vite: {
          build: {
            outDir: 'dist-electron/main',
            lib: {
              entry: 'electron/main/index.ts',
              formats: ['cjs'],
              fileName: () => 'index.js'
            },
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      {
        // Preload script entry point
        entry: 'electron/preload/index.ts',
        onstart(options) {
          // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            lib: {
              entry: 'electron/preload/index.ts',
              formats: ['cjs'],
              fileName: () => 'index.js'
            },
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    renderer()
  ],
  root: 'electron/renderer',
  build: {
    outDir: '../../dist-electron/renderer',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
});
