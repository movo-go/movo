<script lang="ts">
  import TripSidebar from "./TripSidebar.svelte";
  import type { ComparisonCalc, TripState } from "./TripTypes";
  import {
    calculateDirection,
    compareCarShareOptions,
    isInHomeZone,
    type TripParameters,
  } from "../calculations";
  import { onMount } from "svelte";
  import { getMapKit } from "../utilities/mapkit";
  import type { Homezone } from "../types/evo";
  import { Drawer } from "vaul-svelte";
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
    state.inEvoHomeZone = isInHomeZone(homezones, state.destinationCoordinate);
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
  const snapPoints: (number | string)[] = ["70px", 0.4, 0.7, 1];

  let currentSnapPoint = $state<number | string>(snapPoints[0]);

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
      // after creating map ensure overlay is on screen??
      currentSnapPoint = snapPoints[0];

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
</script>

<div class="w-full h-screen flex">
  <div class="hidden md:block md:max-w-96">
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
  <div
    class="absolute md:static md:block w-screen h-screen md:w-full md:h-full md:grow"
  >
    <div class="w-full h-full" bind:this={mapElement}></div>
  </div>
  <Drawer.Root
    modal={false}
    defaultOpen
    open={true}
    dismissible={false}
    {snapPoints}
    bind:activeSnapPoint={currentSnapPoint}
    onActiveSnapPointChange={(point) => {
      console.log("yuh", point);
    }}
  >
    <Drawer.Portal>
      <Drawer.Overlay class="fixed inset-0 bg-black/40 md:hidden" />
      <Drawer.Content
        class="bg-stone-50 flex flex-col fixed bottom-0 left-0 right-0 max-h-[96%] rounded-t-[10px] md:hidden"
      >
        <div class="h-full bg-stone-50">
          <div class="p-1">
            <Drawer.Handle class="bg-stone-500!" />
          </div>
          <div class="px-2">
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
        </div>
      </Drawer.Content>
    </Drawer.Portal>
  </Drawer.Root>
</div>
