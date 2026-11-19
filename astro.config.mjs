import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://idraulico-a-reggio-emilia.it',
  output: 'static',
  trailingSlash: 'never',
  integrations: [tailwind()]
});
