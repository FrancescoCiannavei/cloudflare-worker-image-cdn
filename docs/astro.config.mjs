// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://docs-cloudflare-cdn.ciannavei.dev',
  adapter: cloudflare(),
  integrations: [sitemap()],
});