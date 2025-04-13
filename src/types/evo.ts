import { zu } from "@infra-blocks/zod-utils";
import type { FeatureCollection } from "geojson";
import { z } from "zod";

export type Homezone = z.infer<typeof HomezoneSchema>;
export const HomezoneSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  serviceType: z.string(),
  serviceVisibility: z.string(),
  cityId: z.string(),
  zone: zu.geojson.featureCollection() as z.ZodType<FeatureCollection>,
});
