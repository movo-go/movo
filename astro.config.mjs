import svelte from "@astrojs/svelte";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, envField } from "astro/config";

import superforms from "astro-superforms";

// https://astro.build/config
export default defineConfig({
  integrations: [svelte(), superforms()],
  vite: {
    plugins: [tailwindcss()],
  },
  prefetch: {
    prefetchAll: true,
  },
  env: {
    schema: {
      MAPKIT_TOKEN: envField.string({
        context: "server",
        access: "public",
      }),
    },
  },
});