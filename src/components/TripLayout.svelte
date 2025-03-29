<script lang="ts">
  import TripSidebar from "./TripSidebar.svelte";
  import type { ComparisonCalc, TripState } from "./TripTypes";
  import {
    calculateDirection,
    compareCarShareOptions,
    type TripParameters,
  } from "../calculations";
  import { onMount } from "svelte";
  import { getMapKit } from "../utilities/mapkit";
  import type { Homezone } from "../types/evo";
  const { homezones }: { homezones: Homezone[] } = $props();

  let tripState = $state<TripState>({
    originCoordinate: undefined,
    destinationCoordinate: undefined,
    stayDuration: undefined,
    inEvoHomeZone: false,
    bcaaMembership: false,
    electricVehicle: false,
    roundTripRequired: false,
    route: undefined,
    vehicleType: undefined,
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
    state.inEvoHomeZone = checkIfInEvoHomeZone(
      new mapkitInstance.Coordinate(
        state.destinationCoordinate.latitude,
        state.destinationCoordinate.longitude,
      ),
    );
    // Using the correct response structure from the updated directions.ts file
    const travelTime = result.directions.routes[0].expectedTravelTime;
    const travelDistance = result.directions.routes[0].distance;
    console.log("traveldistance", travelDistance);
    // Calculate total trip time
    const travelTimeMinutes = Math.round((travelTime / 60) * 100) / 100;

    // Calculate days (24 hour periods)
    let tripDistanceKm = Math.ceil(travelDistance / 1000);
    console.log("tripDistanceKm", tripDistanceKm);
    // Now calculate the cost comparison
    const tripParams: TripParameters = {
      start_date: new Date(),
      driving_minutes: travelTimeMinutes,
      staying_minutes: state.stayDuration ?? 0,
      distance_km: tripDistanceKm,
      is_bcaa_member: state.bcaaMembership,
      end_is_in_evo_home_zone: state.inEvoHomeZone,
      is_ev: state.electricVehicle,
      vehicle_preference: state.vehicleType,
      round_trip_required: state.roundTripRequired,
    };
    console.log("tripParams", tripParams);
    const comparisonResult = compareCarShareOptions(tripParams);
    console.log("comparisonResult", comparisonResult);
    return {
      data: comparisonResult,
      error: null,
    };
  }

  let currentRoute = $state<mapkit.Route | undefined>(undefined);
  let currentDestination: mapkit.MarkerAnnotation | undefined;

  let mapElement: HTMLDivElement;
  let map: mapkit.Map;
  let mapkitInstance: typeof mapkit;
  // let routeOverlay: mapkit.Overlay | null = null;
  const defaultDelta = 0.1;
  // Default coordinates (Vancouver)
  const defaultCoordinates = {
    latitude: 49.28091630159075,
    longitude: -123.11395918331695,
  };

  $effect(() => {
    if (tripState.route) {
      if (currentRoute) {
        map.removeOverlay(currentRoute.polyline);
      }
      const polylines = tripState.route.polyline;
      polylines.style = new mapkitInstance.Style({
        strokeColor: "#000088",
        lineWidth: 2,
      });
      if (map) map.showItems(polylines);
      currentRoute = tripState.route;
      if (tripState.destinationCoordinate) {
        if (currentDestination) {
          map.removeAnnotation(currentDestination);
        }
        currentDestination = new mapkitInstance.MarkerAnnotation(
          new mapkitInstance.Coordinate(
            tripState.destinationCoordinate.latitude,
            tripState.destinationCoordinate.longitude,
          ),
        );
        map.addAnnotation(currentDestination);
      }
    }
  });

  onMount(async () => {
    try {
      // Initialize MapKit JS
      mapkitInstance = await getMapKit();

      // Create the map
      map = new mapkitInstance.Map(mapElement, {
        tracksUserLocation: true,
        region: new mapkitInstance.CoordinateRegion(
          new mapkitInstance.Coordinate(
            defaultCoordinates.latitude,
            defaultCoordinates.longitude,
          ),
          new mapkitInstance.CoordinateSpan(defaultDelta, defaultDelta),
        ),
      });
      map.addEventListener("user-location-change", (event) => {
        console.log("user-location-change", event);
        tripState.originCoordinate = event.coordinate;
      });
      map.addEventListener("user-location-error", () => {
        map.region = new mapkitInstance.CoordinateRegion(
          new mapkitInstance.Coordinate(
            defaultCoordinates.latitude,
            defaultCoordinates.longitude,
          ),
          new mapkitInstance.CoordinateSpan(defaultDelta, defaultDelta),
        );
      });

      // map.region = region;

      homezones.forEach((homezone) => {
        const zone = homezone.zone;
        const items = mapkitInstance.importGeoJSON(zone);
        if (items instanceof Error) {
          throw items;
        }

        map.addItems(items);
      });
    } catch (error) {
      console.error("Error initializing Apple Maps:", error);
    }
    map.overlays.forEach(
      (overlay) =>
        (overlay.style = new mapkitInstance.Style({
          fillColor: "#00BCE2",
          strokeColor: "#00BCE2",
        })),
    );
  });

  // TODO DEFINITELY A BUG HERE LOL
  function checkIfInEvoHomeZone(coordinate: mapkit.Coordinate) {
    console.log("checking if in evo home zone", coordinate);
    const point = map.convertCoordinateToPointOnPage(coordinate);
    const overlays = map.overlaysAtPoint(point);
    console.log("overlays", overlays);
    return overlays.length > 0;
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
      bind:roundTripRequired={tripState.roundTripRequired}
      bind:vehicleType={tripState.vehicleType}
      route={tripState.route}
      {comparisonResult}
      calculateTripDetails={onSubmit}
    />
  </div>

  <div class="flex-1">
    <div class="w-full h-full" bind:this={mapElement}></div>
  </div>
</div>
