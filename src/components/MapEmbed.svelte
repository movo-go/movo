<script lang="ts">
  import { onMount } from "svelte";
  import type { CollectionEntry } from "astro:content";
  import { getMapKit } from "../utilities/mapkit";

  interface Props {
    homezones: CollectionEntry<"homezones">[];
    locationData: LocationData;
  }

  const { homezones, locationData }: Props = $props();

  interface LocationData {
    originCoordinates: {
      latitude: number;
      longitude: number;
    } | null;
    destinationCoordinates: {
      latitude: number;
      longitude: number;
    } | null;
  }

  let mapElement: HTMLDivElement;
  let map: mapkit.Map;
  let mapkitInstance: typeof mapkit;
  let routeOverlay: mapkit.Overlay | null = null;

  // Default coordinates (Vancouver)
  const defaultCoordinates = {
    latitude: 49.28091630159075,
    longitude: -123.11395918331695,
    span: {
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    },
  };

  // Update map when location data changes
  $effect(() => {
    if (map && mapkitInstance) {
      updateMapWithCoordinates(locationData);
    }
  });

  async function updateMapWithCoordinates(data: LocationData) {
    if (!map || !mapkitInstance) return;

    // Remove existing annotations
    map.removeAnnotations(map.annotations);

    // Remove existing route overlay if any
    if (routeOverlay && map.overlays) {
      map.removeOverlay(routeOverlay);
      routeOverlay = null;
    }

    // If we have origin coordinates, add a marker
    if (data.originCoordinates) {
      const originMarker = new mapkitInstance.MarkerAnnotation(
        new mapkitInstance.Coordinate(
          data.originCoordinates.latitude,
          data.originCoordinates.longitude,
        ),
      );
      originMarker.color = "#0066CC"; // Blue for origin
      map.addAnnotation(originMarker);
    }

    // If we have destination coordinates, add a marker
    if (data.destinationCoordinates) {
      const destMarker = new mapkitInstance.MarkerAnnotation(
        new mapkitInstance.Coordinate(
          data.destinationCoordinates.latitude,
          data.destinationCoordinates.longitude,
        ),
      );
      destMarker.color = "#CC0000"; // Red for destination
      destMarker.selected = true;
      map.addAnnotation(destMarker);
    }

    // If we have both origin and destination, fit both points on the map
    if (data.originCoordinates && data.destinationCoordinates) {
      // Create a padding for fitting points on the map
      const padding = new mapkitInstance.Padding({
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      });

      // Create array of points as annotations for the map
      const originPoint = new mapkitInstance.MarkerAnnotation(
        new mapkitInstance.Coordinate(
          data.originCoordinates.latitude,
          data.originCoordinates.longitude,
        ),
      );

      const destPoint = new mapkitInstance.MarkerAnnotation(
        new mapkitInstance.Coordinate(
          data.destinationCoordinates.latitude,
          data.destinationCoordinates.longitude,
        ),
      );

      // Fit points on the map with padding - using annotations, not coordinates
      map.showItems([originPoint, destPoint], { padding });

      // Create directions instance and request
      const directions = new mapkitInstance.Directions();

      // Create a request to get route with proper coordinate objects
      const originCoord = new mapkitInstance.Coordinate(
        data.originCoordinates.latitude,
        data.originCoordinates.longitude,
      );

      const destCoord = new mapkitInstance.Coordinate(
        data.destinationCoordinates.latitude,
        data.destinationCoordinates.longitude,
      );

      const request = {
        origin: originCoord,
        destination: destCoord,
        transportType: mapkitInstance.Directions.Transport.Automobile,
      };

      // Instead of trying to render the route with a custom overlay,
      // we'll use the built-in directions renderer when available
      try {
        directions.route(request, (error, _) => {
          if (error) {
            console.error("Error getting directions:", error);
          }
        });
      } catch (error) {
        console.error("Error rendering route:", error);
      }
    }
    // If we only have one coordinate, center on it
    else if (data.originCoordinates) {
      const region = new mapkitInstance.CoordinateRegion(
        new mapkitInstance.Coordinate(
          data.originCoordinates.latitude,
          data.originCoordinates.longitude,
        ),
        new mapkitInstance.CoordinateSpan(0.05, 0.05),
      );
      map.region = region;
    } else if (data.destinationCoordinates) {
      const region = new mapkitInstance.CoordinateRegion(
        new mapkitInstance.Coordinate(
          data.destinationCoordinates.latitude,
          data.destinationCoordinates.longitude,
        ),
        new mapkitInstance.CoordinateSpan(0.05, 0.05),
      );
      map.region = region;
    }
  }

  onMount(async () => {
    try {
      // Initialize MapKit JS
      mapkitInstance = await getMapKit();

      // Create a coordinate region
      const region = new mapkitInstance.CoordinateRegion(
        new mapkitInstance.Coordinate(
          defaultCoordinates.latitude,
          defaultCoordinates.longitude,
        ),
        new mapkitInstance.CoordinateSpan(
          defaultCoordinates.span.latitudeDelta,
          defaultCoordinates.span.longitudeDelta,
        ),
      );

      // Create the map
      map = new mapkitInstance.Map(mapElement);
      map.region = region;

      homezones.forEach((homezone) => {
        const zone = homezone.data.zone;
        const items = mapkitInstance.importGeoJSON(zone);
        if (items instanceof Error) {
          throw items;
        }

        map.addItems(items);
      });

      // Update the map with any initial coordinates
      if (
        locationData.originCoordinates ||
        locationData.destinationCoordinates
      ) {
        updateMapWithCoordinates(locationData);
      }
    } catch (error) {
      console.error("Error initializing Apple Maps:", error);
    }
  });
</script>

<div class="w-full h-full" bind:this={mapElement}></div>
