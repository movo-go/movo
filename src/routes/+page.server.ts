import homezones from "../data/evo/homezones.json";
import { HomezoneSchema } from "../types/evo";
import type { PageServerLoad } from "./$types";

export const prerender = true;

export const load: PageServerLoad = () => {
  return {
    homezones: HomezoneSchema.array().parse(homezones),
  };
};
