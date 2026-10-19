import { iwsdkDev } from '@iwsdk/vite-plugin-dev';
import { defineConfig } from 'vite';

// iwsdkDev serves `npm run dev` over HTTPS (a cached self-signed certificate in .iwsdk/https)
// so Quest Browser on the same Wi-Fi can enter WebXR, and adds IWSDK's desktop XR emulator.
export default defineConfig({
  plugins: [iwsdkDev()],
  server: { host: '0.0.0.0', port: 8081, open: false },
  build: {
    outDir: 'dist',
    target: 'esnext',
    rollupOptions: { input: './index.html' },
  },
  esbuild: { target: 'esnext' },
  resolve: { dedupe: ['three'] },
  optimizeDeps: {
    exclude: ['@babylonjs/havok'],
    esbuildOptions: { target: 'esnext' },
  },
  publicDir: 'public',
  // Relative base works for https://clrke.github.io/spatial-lab-webxr/ and for localhost.
  base: './',
});
