import { getMapKit } from "../utilities/mapkit";

export const calculateDirection = async (
  start: mapkit.Coordinate,
  end: mapkit.Coordinate,
  departureDate: Date,
) => {
  const mapkit = await getMapKit();
  const directions = new mapkit.Directions();
  const directionsRequest: mapkit.DirectionsRequest = {
    origin: start,
    destination: end,
    transportType: mapkit.Directions.Transport.Automobile,
    departureDate,
  };

  // Using the correct ETA response structure
  const route = new Promise<{ directions: mapkit.DirectionsResponse }>(
    (resolve, reject) => {
      directions.route(directionsRequest, (error, data) => {
        if (error) {
          console.error(error);
          reject(error);
        } else if (data) {
          resolve({ directions: data });
        } else {
          reject(new Error("No data returned from directions API"));
        }
      });
    },
  );

  return route;
};
