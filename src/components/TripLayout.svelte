<script lang="ts">
  import TripSidebar from "./TripSidebar.svelte";
  import MapEmbed from "./MapEmbed.svelte";
  import type { CollectionEntry } from "astro:content";
  import type { ComparisonCalc, TripState } from "./TripTypes";
  import { calculateDirection, compareCarShareOptions } from "../calculations";
  const {
    homezones,
  }: TripState & { homezones: CollectionEntry<"homezones">[] } = $props();

  let tripState = $state<TripState>({
    originCoordinate: undefined,
    destinationCoordinate: undefined,
    stayDuration: undefined,
    inEvoHomeZone: false,
    bcaaMembership: false,
    electricVehicle: false,
    twoWayEvo: false,
    route: undefined,
  });

  let comparisonResult = $state<Promise<ComparisonCalc>>();

  function onSubmit() {
    comparisonResult = calculateTripDetails(tripState);
  }

  async function calculateTripDetails(
    state: TripState,
  ): Promise<ComparisonCalc> {
    if (!state.originCoordinate || !state.destinationCoordinate) {
      console.error("No origin or destination coordinates");
      return {
        data: null,
        error: {
          message: "No origin or destination coordinates",
          show: true,
        },
      };
    }

    // Get directions from MapKit
    const startCoord = state.originCoordinate;
    const endCoord = state.destinationCoordinate;
    const result = await calculateDirection(
      new mapkit.Coordinate(startCoord.latitude, startCoord.longitude),
      new mapkit.Coordinate(endCoord.latitude, endCoord.longitude),
      new Date(),
    );

    console.log("Result:", result);
    if (!result.directions.routes[0]) {
      console.error("No routes found");
      return {
        data: null,
        error: {
          message: "No routes found",
          show: true,
        },
      };
    }
    state.route = result.directions.routes[0];
    // Using the correct response structure from the updated directions.ts file
    const travelTime = result.directions.routes[0].expectedTravelTime;
    const travelDistance = result.directions.routes[0].distance;
    // Calculate total trip time
    let totalDurationMinutes = Math.round((travelTime / 60) * 100) / 100;
    console.log("Total duration minutes:", totalDurationMinutes);
    // Add stay duration
    totalDurationMinutes += state.stayDuration ?? 0;

    let tripDistanceMeters = travelDistance;
    // Double for round trip if selected
    if (state.twoWayEvo) {
      totalDurationMinutes += travelTime / 60;
      tripDistanceMeters = travelDistance * 2;
    }

    // Calculate days (24 hour periods)
    const days = Math.floor(totalDurationMinutes / (24 * 60));
    const tripDistanceKm = Math.min(Math.round(tripDistanceMeters / 1000), 1);
    // Now calculate the cost comparison
    const tripParams = {
      duration_minutes: totalDurationMinutes,
      distance_km: tripDistanceKm,
      is_overnight: false, // This would need more sophisticated calculation based on time of day
      overnight_minutes: 0, // This would need more sophisticated calculation
      days: days,
      is_bcaa_member: false, // This could be a user preference
      vehicle_preference: "daily_drive" as const,
      is_ev: false,
    };

    // Compare car share options
    const comparisonResult = compareCarShareOptions(tripParams);
    return {
      data: comparisonResult,
      error: null,
    };
  }
</script>

<div class="w-full h-screen flex flex-col lg:flex-row">
  <div class="w-full lg:w-96 overflow-auto">
    <TripSidebar
      bind:originCoordinate={tripState.originCoordinate}
      bind:destinationCoordinate={tripState.destinationCoordinate}
      inEvoHomeZone={tripState.inEvoHomeZone}
      bind:stayDuration={tripState.stayDuration}
      bind:bcaaMembership={tripState.bcaaMembership}
      bind:electricVehicle={tripState.electricVehicle}
      bind:twoWayEvo={tripState.twoWayEvo}
      route={tripState.route}
      {comparisonResult}
      calculateTripDetails={onSubmit}
    />
  </div>

  <div class="flex-1">
    <MapEmbed
      {homezones}
      {...tripState}
      bind:inEvoHomeZone={tripState.inEvoHomeZone}
      bind:originCoordinate={tripState.originCoordinate}
    />
  </div>
</div>
