// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://familyandthefield.com',
  // Static by default. Harvest and /api/season opt into on-demand rendering.
  output: 'static',
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()]
  }
});
