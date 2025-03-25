<script lang="ts">
  import { onMount } from "svelte";
  import { getMapKit } from "../utilities/mapkit";
  import type { TripState } from "./TripTypes";
  import type { CollectionEntry } from "astro:content";

  let {
    homezones,
    originCoordinate = $bindable(),
    route,
    destinationCoordinate,
    inEvoHomeZone = $bindable(),
  }: TripState & { homezones: CollectionEntry<"homezones">[] } = $props();
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
    if (route) {
      if (currentRoute) {
        map.removeOverlay(currentRoute.polyline);
      }
      const polylines = route.polyline;
      polylines.style = new mapkitInstance.Style({
        strokeColor: "#000088",
        lineWidth: 2,
      });
      if (map) map.showItems(polylines);
      currentRoute = route;
      if (destinationCoordinate) {
        if (currentDestination) {
          map.removeAnnotation(currentDestination);
        }
        currentDestination = new mapkitInstance.MarkerAnnotation(
          new mapkitInstance.Coordinate(
            destinationCoordinate.latitude,
            destinationCoordinate.longitude,
          ),
        );
        map.addAnnotation(currentDestination);
        const point = map.convertCoordinateToPointOnPage(
          new mapkitInstance.Coordinate(
            destinationCoordinate.latitude,
            destinationCoordinate.longitude,
          ),
        );
        console.log("point", point);
        console.log("all overlays", map.overlays);
        const overlays = map.overlaysAtPoint(point);
        console.log("overlays", overlays);
        inEvoHomeZone =
          map.overlaysAtPoint(
            map.convertCoordinateToPointOnPage(
              new mapkitInstance.Coordinate(
                destinationCoordinate.latitude,
                destinationCoordinate.longitude,
              ),
            ),
          ).length > 0;
        console.log("inEvoHomeZone", inEvoHomeZone);
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
        originCoordinate = event.coordinate;
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
        const zone = homezone.data.zone;
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

<div class="w-full h-full" bind:this={mapElement}></div>
