import { getMapKit } from "../utilities/mapkit";

export const calculateDirection = async (
  start: mapkit.Coordinate,
  end: mapkit.Coordinate,
  departureDate: Date,
) => {
  const mapkit = await getMapKit();
  const directions = new mapkit.Directions();
  const etaRequest: mapkit.EtaRequestOptions = {
    destinations: [end],
    transportType: mapkit.Directions.Transport.Automobile,
    origin: start,
    departureDate,
  };
  
  // Using the correct ETA response structure
  const route = new Promise<{ destinations: mapkit.EtaResponse }>((resolve, reject) => {
    directions.eta(etaRequest, (error, data) => {
      if (error) {
        console.error(error);
        reject(error);
      } else if (data) {
        resolve({ destinations: data });
      } else {
        reject(new Error("No data returned from directions API"));
      }
    });
  });
  
  return route;
};
