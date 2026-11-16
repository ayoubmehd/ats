// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

const apiOrigin = 'http://localhost:3000';

const apiProxy = {
  '/auth': apiOrigin,
  '/jobs': apiOrigin,
  '/candidates': apiOrigin,
  '/applications': apiOrigin,
};

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [react()],
  server: {
    host: '127.0.0.1',
    port: 4321,
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: apiProxy,
    },
    preview: {
      proxy: apiProxy,
    },
  },
});
