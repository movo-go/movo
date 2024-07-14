import { defineConfig, envField } from "astro/config";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [svelte(), tailwind()],
  prefetch: {
    prefetchAll: true,
  },
  experimental: {
    env: {
      schema: {
        MAPKIT_TOKEN: envField.string({
          context: "server",
          access: "public",
        }),
      },
    },
  },
});
