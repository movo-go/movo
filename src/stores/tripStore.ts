import { atom } from 'nanostores';
import type { ComparisonResult } from '../calculations/price';

// Define the structure of our trip data
export interface TripData {
  startDate: Date;
  endDate: Date;
  modoPlan: string;
  isBcaaMember: boolean;
  distance_km: number;
  vehiclePreference?: 'daily_drive' | 'large_loadable' | 'oversized' | undefined;
  isEv?: boolean | undefined;
}

// Create an atom to store the trip data
export const tripDataStore = atom<TripData | null>(null);

// Create an atom to store the comparison results
export const comparisonResultStore = atom<ComparisonResult | null>(null); 