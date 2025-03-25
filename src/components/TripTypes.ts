import type { ComparisonResult } from "../calculations";

export interface TripState {
  originCoordinate: mapkit.Coordinate | undefined;
  destinationCoordinate: mapkit.Coordinate | undefined;
  inEvoHomeZone: boolean;
  stayDuration: number | undefined;
  bcaaMembership: boolean;
  electricVehicle: boolean;
  twoWayEvo: boolean;
  route: mapkit.Route | undefined;
}
type ComparisonError = {
  message: string;
  show: boolean;
};
export type ComparisonCalc = {
  data: ComparisonResult | null;
  error: ComparisonError | null;
};
