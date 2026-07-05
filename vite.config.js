import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // The admin panel screens (ported from the standalone CRA app) are authored
  // as `.js` files that contain JSX. These settings let Vite/esbuild parse JSX
  // inside `.js` files in addition to `.jsx`.
  plugins: [react({ include: /\.(js|jsx)$/ })],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    // Split big vendor libraries into separate chunks for faster loading
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
