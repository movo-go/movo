import { zu } from "@infra-blocks/zod-utils";
import { file } from "astro/loaders";
import { defineCollection, z } from "astro:content";

const homezones = defineCollection({
  loader: file("src/data/evo/homezones.json"),
  schema: z.object({
    id: z.string(),
    serviceId: z.string(),
    serviceType: z.string(),
    serviceVisibility: z.string(),
    cityId: z.string(),
    zone: zu.geojson.featureCollection(),
  }),
});

export const collections = {
  homezones,
};
