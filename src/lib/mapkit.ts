import { getMapKit } from "../utilities/mapkit";

export const mk = {
  search: {
    autocomplete: async (
      query: string,
      options?: mapkit.SearchAutocompleteOptions & { signal?: AbortSignal },
    ): Promise<mapkit.SearchAutocompleteResult[]> => {
      const { signal, ...restOptions } = options ?? {};

      const mk = await getMapKit();

      const search = new mk.Search({
        getsUserLocation: true,
        includeQueries: false,
        includePointsOfInterest: true,
        includeAddresses: true,
        // TODO: Export this somewhere instead of hardcoding it.
        coordinate: new mapkit.Coordinate(
          49.28091630159075,
          -123.11395918331695,
        ),
      });

      return await new Promise<mapkit.SearchAutocompleteResult[]>(
        (resolve, reject) => {
          const requestId = search.autocomplete(
            query,
            (error, response) => {
              if (error) {
                reject(error);
                return;
              }

              resolve(response.results);
            },
            restOptions,
          );

          signal?.addEventListener("abort", () => search.cancel(requestId), {
            once: true,
            passive: true,
          });
        },
      );
    },
  },
};
