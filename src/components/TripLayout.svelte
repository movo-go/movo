<script lang="ts">
  import TripSidebar from "./TripSidebar.svelte";
  import MapEmbed from "./MapEmbed.svelte";
  import { writable } from "svelte/store";
  import type { CollectionEntry } from "astro:content";

  interface Props {
    homezones: CollectionEntry<"homezones">[];
  }

  const { homezones }: Props = $props();

  // Define interfaces for our location data
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

  interface LocationUpdateEvent {
    detail: {
      originCoordinates: {
        latitude: number;
        longitude: number;
      } | null;
      destinationCoordinates: {
        latitude: number;
        longitude: number;
      } | null;
    };
  }

  // Create a store to share location data
  const locationStore = writable<LocationData>({
    originCoordinates: null,
    destinationCoordinates: null,
  });

  // Handle location updates from the sidebar
  function handleLocationUpdate(event: LocationUpdateEvent) {
    const { originCoordinates, destinationCoordinates } = event.detail;
    locationStore.set({ originCoordinates, destinationCoordinates });
  }
</script>

<div class="w-full h-screen flex flex-col lg:flex-row">
  <div class="w-full lg:w-96 overflow-auto">
    <TripSidebar on:locationUpdate={handleLocationUpdate} />
  </div>

  <div class="flex-1">
    <MapEmbed {homezones} locationData={$locationStore} />
  </div>
</div>
