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
  const route = new Promise<mapkit.EtaResponse>((resolve, reject) => {
    directions.eta(etaRequest, (error, data) => {
      if (error) {
        console.error(error);
        reject(error);
      }
      resolve(data);
    });
  });
  return route;
};
