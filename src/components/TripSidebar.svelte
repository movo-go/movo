<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import Address from "./Address.svelte";
  import {
    compareCarShareOptions,
    type ComparisonResult,
  } from "../calculations/price";
  import { calculateDirection } from "../calculations/direction";
  import { getMapKit } from "../utilities/mapkit";

  // Create an event dispatcher to communicate with parent components
  const dispatch = createEventDispatcher<{
    locationUpdate: {
      originCoordinates: { latitude: number; longitude: number } | null;
      destinationCoordinates: { latitude: number; longitude: number } | null;
    };
  }>();

  // Form state
  let isFormView = $state(true);
  let originAddress = $state<mapkit.SearchAutocompleteResult | undefined>(
    undefined,
  );
  let destinationAddress = $state<mapkit.SearchAutocompleteResult | undefined>(
    undefined,
  );
  let stayDuration = $state(60); // Default to 60 minutes
  let isRoundTrip = $state(true); // Default to round trip
  let isLoading = $state(false);
  let errorMessage = $state<string | null>(null);

  // Results state
  let tripDistance = $state<number | null>(null);
  let tripDuration = $state<number | null>(null);
  let comparisonResult = $state<ComparisonResult | null>(null);

  // Get current location on component mount
  onMount(async () => {
    try {
      // Check if there are URL parameters
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);

        // Get coordinates from URL with the new parameter names
        const fromLat = url.searchParams.get("fromLat");
        const fromLong = url.searchParams.get("fromLong");
        const toLat = url.searchParams.get("toLat");
        const toLong = url.searchParams.get("toLong");
        const stay = url.searchParams.get("stay");
        const roundtrip = url.searchParams.get("roundtrip");

        // If we have coordinates in the URL, use them
        if (fromLat && fromLong && toLat && toLong) {
          isFormView = false;

          // Set stay duration and round trip settings if provided
          if (stay) stayDuration = parseInt(stay, 10);
          if (roundtrip) isRoundTrip = roundtrip === "true";

          // Create mapkit coordinates
          const mk = await getMapKit();
          const originCoord = new mk.Coordinate(
            parseFloat(fromLat),
            parseFloat(fromLong),
          );
          const destCoord = new mk.Coordinate(
            parseFloat(toLat),
            parseFloat(toLong),
          );

          // Create dummy search results for the coordinates
          originAddress = {
            coordinate: originCoord,
            displayLines: ["Current Location"],
            region: {} as mapkit.CoordinateRegion,
          } as mapkit.SearchAutocompleteResult;

          destinationAddress = {
            coordinate: destCoord,
            displayLines: ["Destination"],
            region: {} as mapkit.CoordinateRegion,
          } as mapkit.SearchAutocompleteResult;

          // Calculate the trip details
          await calculateTripDetails();
        } else {
          // If no coordinates in URL, try to get user location
          getCurrentLocation();
        }
      } else {
        // If window object is not available (SSR), we'll try to get location on client
        getCurrentLocation();
      }
    } catch (error) {
      console.error("Error handling URL parameters:", error);
    }
  });

  // Try to get the user's current location
  async function getCurrentLocation() {
    if (navigator.geolocation) {
      try {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const mk = await getMapKit();
            const coordinate = new mk.Coordinate(
              position.coords.latitude,
              position.coords.longitude,
            );

            // Create a simple displayLines array for the current location
            const displayLines = ["Current Location"];

            // Create a search result object with the location
            originAddress = {
              coordinate: coordinate,
              displayLines: displayLines,
              region: {} as mapkit.CoordinateRegion,
            } as mapkit.SearchAutocompleteResult;
            console.log("Origin address:", originAddress);

            // Dispatch an event to update the map
            updateMapWithCoordinates();
          },
          (error) => {
            console.error("Error getting location:", error);
          },
        );
      } catch (error) {
        console.error("Error in geolocation:", error);
      }
    }
  }

  // Update the URL with current parameters using the new parameter names
  function updateURL() {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams();

    // Add parameters if we have addresses
    if (originAddress?.coordinate) {
      params.set("fromLat", originAddress.coordinate.latitude.toString());
      params.set("fromLong", originAddress.coordinate.longitude.toString());
    }

    if (destinationAddress?.coordinate) {
      params.set("toLat", destinationAddress.coordinate.latitude.toString());
      params.set("toLong", destinationAddress.coordinate.longitude.toString());
    }

    // Add other parameters
    params.set("stay", stayDuration.toString());
    params.set("roundtrip", isRoundTrip.toString());

    // Update URL without reloading the page
    const url = new URL(window.location.href);
    url.search = params.toString();
    window.history.pushState({}, "", url.toString());
  }

  // Calculate trip details
  async function calculateTripDetails() {
    if (!originAddress?.coordinate || !destinationAddress?.coordinate) {
      errorMessage = "Please enter both origin and destination addresses";
      return;
    }

    errorMessage = null;
    isLoading = true;
    console.log("Calculating trip details", originAddress, destinationAddress);

    try {
      // Get directions from MapKit
      const startCoord = originAddress.coordinate;
      const endCoord = destinationAddress.coordinate;
      console.log("Start coordinate:", startCoord);
      console.log("End coordinate:", endCoord);
      const result = await calculateDirection(
        new mapkit.Coordinate(startCoord.latitude, startCoord.longitude),
        new mapkit.Coordinate(endCoord.latitude, endCoord.longitude),
        new Date(),
      );

      console.log("Result:", result);

      // Using the correct response structure from the updated directions.ts file
      if (result && result.destinations && result.destinations.etas.length > 0 && result.destinations.etas[0]) {
        const travelTime = result.destinations.etas[0]
        // Calculate total trip time
        let totalDurationMinutes = travelTime.expectedTravelTime / 60;

        // Add stay duration
        totalDurationMinutes += stayDuration;

        // Double for round trip if selected
        if (isRoundTrip) {
          totalDurationMinutes += travelTime.expectedTravelTime / 60;
        }

        // Calculate days (24 hour periods)
        const days = Math.floor(totalDurationMinutes / (24 * 60));
        const tripDistanceMeters = isRoundTrip ? travelTime.distance * 2 : travelTime.distance;
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
        comparisonResult = compareCarShareOptions(tripParams);

        // Update the view
        isFormView = false;

        // Update URL with parameters for sharing
        updateURL();
      } else {
        errorMessage =
          "Could not calculate route. Please try different addresses.";
      }
    } catch (error) {
      console.error("Error calculating trip:", error);
      errorMessage =
        "An error occurred while calculating the trip. Please try again.";
    } finally {
      isLoading = false;
    }
  }

  // Update the map with coordinates
  function updateMapWithCoordinates() {
    dispatch("locationUpdate", {
      originCoordinates: originAddress?.coordinate
        ? {
            latitude: originAddress.coordinate.latitude,
            longitude: originAddress.coordinate.longitude,
          }
        : null,
      destinationCoordinates: destinationAddress?.coordinate
        ? {
            latitude: destinationAddress.coordinate.latitude,
            longitude: destinationAddress.coordinate.longitude,
          }
        : null,
    });
  }

  // Effect to update map when addresses change
  $effect(() => {
    updateMapWithCoordinates();
  });

  // Reset to form view
  function resetForm() {
    isFormView = true;
    comparisonResult = null;

    // Keep the addresses but allow user to modify them
  }
</script>

<div class="w-full h-full overflow-y-auto p-5 bg-white shadow-md">
  {#if isFormView}
    <!-- Form View -->
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-800">Plan Your Trip</h1>

      <div class="space-y-4">
        <div>
          <Address
            bind:value={originAddress}
            class="w-full"
            placeholder="Starting location"
            required
          />
          <p class="text-xs text-gray-500 mt-1">
            We'll try to use your current location if allowed
          </p>
        </div>

        <div>
          <Address
            bind:value={destinationAddress}
            class="w-full"
            placeholder="Where do you want to go?"
            required
          />
        </div>

        <div>
          <label
            for="stay-duration"
            class="block text-sm text-gray-700 font-medium"
          >
            Stay Duration (minutes)
          </label>
          <input
            id="stay-duration"
            type="number"
            min="0"
            bind:value={stayDuration}
            class="border-2 border-gray-800 px-2 py-3 bg-transparent w-full mt-1"
          />
        </div>

        <div class="flex items-center">
          <input
            id="round-trip"
            type="checkbox"
            bind:checked={isRoundTrip}
            class="h-4 w-4 text-gray-800 border-gray-800 rounded"
          />
          <label for="round-trip" class="ml-2 block text-sm text-gray-700">
            Round Trip
          </label>
        </div>
      </div>

      {#if errorMessage}
        <div class="p-3 bg-red-100 text-red-700 rounded-md">
          {errorMessage}
        </div>
      {/if}

      <button
        onclick={calculateTripDetails}
        disabled={!originAddress || !destinationAddress || isLoading}
        class="bg-gray-800 text-orange-50 w-full px-2 py-3 uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if isLoading}
          Calculating...
        {:else}
          Calculate Trip
        {/if}
      </button>
    </div>
  {:else}
    <!-- Results View -->
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="text-2xl font-bold text-gray-800">Trip Results</h1>
        <button
          onclick={resetForm}
          class="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          Edit Trip
        </button>
      </div>

      <div class="bg-gray-100 p-4 rounded-md space-y-3">
        <div class="flex justify-between">
          <span class="font-medium">From:</span>
          <span class="text-right"
            >{originAddress?.displayLines.join(", ")}</span
          >
        </div>
        <div class="flex justify-between">
          <span class="font-medium">To:</span>
          <span class="text-right"
            >{destinationAddress?.displayLines.join(", ")}</span
          >
        </div>
        <div class="flex justify-between">
          <span class="font-medium">Distance:</span>
          <span
            >{tripDistance?.toFixed(1)} km {isRoundTrip
              ? "(round trip)"
              : "(one way)"}</span
          >
        </div>
        <div class="flex justify-between">
          <span class="font-medium">Travel Time:</span>
          <span
            >{Math.round(tripDuration || 0)} minutes {isRoundTrip
              ? "each way"
              : ""}</span
          >
        </div>
        <div class="flex justify-between">
          <span class="font-medium">Stay Duration:</span>
          <span>{stayDuration} minutes</span>
        </div>
      </div>

      {#if comparisonResult}
        <div class="border-t-2 border-gray-200 pt-4">
          <h2 class="text-xl font-semibold mb-4 text-gray-800">
            Cost Comparison
          </h2>

          <div class="space-y-4">
            <!-- Cheapest Option Highlight -->
            <div class="bg-green-100 p-4 rounded-md">
              <p class="font-bold text-green-800">
                Best Option: {comparisonResult.cheapest_option}
              </p>
              <p class="text-green-700">
                You save ${comparisonResult.savings.toFixed(2)} compared to the next
                best option
              </p>
            </div>

            <!-- Evo Cost -->
            <div class="border border-gray-200 rounded-md overflow-hidden">
              <div class="bg-gray-800 text-white p-3 font-bold">
                Evo: ${comparisonResult.evo.total.toFixed(2)}
              </div>
              <div class="p-3 space-y-2">
                <div class="flex justify-between text-sm">
                  <span>Time cost:</span>
                  <span>${comparisonResult.evo.time_cost.toFixed(2)}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span>Fees:</span>
                  <span>${comparisonResult.evo.fees.toFixed(2)}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span>Taxes:</span>
                  <span>${comparisonResult.evo.taxes.toFixed(2)}</span>
                </div>
                {#if comparisonResult.evo.discounts > 0}
                  <div class="flex justify-between text-sm text-green-600">
                    <span>Discounts:</span>
                    <span>-${comparisonResult.evo.discounts.toFixed(2)}</span>
                  </div>
                {/if}
              </div>
            </div>

            <!-- Modo Plus Cost -->
            <div class="border border-gray-200 rounded-md overflow-hidden">
              <div class="bg-gray-800 text-white p-3 font-bold">
                Modo Plus: ${comparisonResult.modo_plus.total.toFixed(2)}
              </div>
              <div class="p-3 space-y-2">
                <div class="flex justify-between text-sm">
                  <span>Time cost:</span>
                  <span>${comparisonResult.modo_plus.time_cost.toFixed(2)}</span
                  >
                </div>
                <div class="flex justify-between text-sm">
                  <span>Distance cost:</span>
                  <span
                    >${comparisonResult.modo_plus.distance_cost.toFixed(
                      2,
                    )}</span
                  >
                </div>
                <div class="flex justify-between text-sm">
                  <span>Fees:</span>
                  <span>${comparisonResult.modo_plus.fees.toFixed(2)}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span>Taxes:</span>
                  <span>${comparisonResult.modo_plus.taxes.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <!-- Modo Monthly Cost -->
            <div class="border border-gray-200 rounded-md overflow-hidden">
              <div class="bg-gray-800 text-white p-3 font-bold">
                Modo Monthly: ${comparisonResult.modo_monthly.total.toFixed(2)}
              </div>
              <div class="p-3 space-y-2">
                <div class="flex justify-between text-sm">
                  <span>Time cost:</span>
                  <span
                    >${comparisonResult.modo_monthly.time_cost.toFixed(2)}</span
                  >
                </div>
                <div class="flex justify-between text-sm">
                  <span>Distance cost:</span>
                  <span
                    >${comparisonResult.modo_monthly.distance_cost.toFixed(
                      2,
                    )}</span
                  >
                </div>
                <div class="flex justify-between text-sm">
                  <span>Fees:</span>
                  <span>${comparisonResult.modo_monthly.fees.toFixed(2)}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span>Taxes:</span>
                  <span>${comparisonResult.modo_monthly.taxes.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
