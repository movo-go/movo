<script lang="ts">
  import Address from "./Address.svelte";
  import type { ComparisonCalc, TripState } from "./TripTypes";
  // Get current location on component mount

  // Update the map with coordinates
  let {
    originCoordinate = $bindable(),
    destinationCoordinate = $bindable(),
    inEvoHomeZone,
    stayDuration = $bindable(),
    bcaaMembership = $bindable(),
    electricVehicle = $bindable(),
    twoWayEvo = $bindable(),
    comparisonResult,
    calculateTripDetails,
  }: TripState & {
    comparisonResult: Promise<ComparisonCalc> | undefined;
    calculateTripDetails: () => void;
  } = $props();

  let origin = $state<mapkit.SearchAutocompleteResult | undefined>(undefined);
  let destination = $state<mapkit.SearchAutocompleteResult | undefined>(
    undefined,
  );

  $inspect(originCoordinate, destinationCoordinate, origin, destination);

  $effect(() => {
    if (origin) {
      originCoordinate = origin.coordinate;
    }
    if (destination) {
      destinationCoordinate = destination.coordinate;
    }
  });

  let isFormView = $state(true);
  let isLoading = $state(false);
</script>

<div class="w-full h-full overflow-y-auto p-5 bg-white shadow-md">
  {#if isFormView}
    <!-- Form View -->
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-800">Plan Your Trip</h1>

      <div class="space-y-4">
        <div>
          <Address
            textLabel="Origin"
            bind:value={origin}
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
            textLabel="Destination"
            bind:value={destination}
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
            bind:checked={twoWayEvo}
            class="h-4 w-4 text-gray-800 border-gray-800 rounded"
          />
          <label for="round-trip" class="ml-2 block text-sm text-gray-700">
            Round Trip
          </label>
        </div>
      </div>

      <button
        disabled={(!origin && !originCoordinate) ||
          (!destination && !destinationCoordinate) ||
          isLoading}
        onclick={() => {
          calculateTripDetails();
          isFormView = false;
        }}
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
    {#await comparisonResult}
      Loading...
    {:then result}
      {#if !result}
        <!-- Do nothing -->
      {:else if result.error}
        <div class="text-red-500">
          {result.error.message}
        </div>
      {:else if !result.data}
        <!-- Do nothing -->
      {:else}
        <!-- Results View -->
        <div class="space-y-6">
          <div class="flex justify-between items-center">
            <h1 class="text-2xl font-bold text-gray-800">Trip Results</h1>
            <button
              onclick={() => {
                isFormView = true;
              }}
              class="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Edit Trip
            </button>
          </div>

          <div class="bg-gray-100 p-4 rounded-md space-y-3">
            <div class="flex justify-between">
              <span class="font-medium">From:</span>
              {#if origin}
                <span class="text-right">{origin.displayLines.join(", ")}</span>
              {:else}
                <span class="text-right"> Your current location </span>
              {/if}
            </div>
            <div class="flex justify-between">
              <span class="font-medium">To:</span>
              <span class="text-right"
                >{destination?.displayLines.join(", ")}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="font-medium">Distance:</span>
              <span
                >{result.data.distance_km?.toFixed(1)} km {twoWayEvo
                  ? "(round trip)"
                  : "(one way)"}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="font-medium">Travel Time:</span>
              <span
                >{Math.round(result.data.duration_minutes || 0)} minutes {twoWayEvo
                  ? "each way"
                  : ""}</span
              >
            </div>
            <div class="flex justify-between">
              <span class="font-medium">Stay Duration:</span>
              <span>{stayDuration} minutes</span>
            </div>
          </div>

          <div class="border-t-2 border-gray-200 pt-4">
            <h2 class="text-xl font-semibold mb-4 text-gray-800">
              Cost Comparison
            </h2>

            <div class="space-y-4">
              <!-- Cheapest Option Highlight -->
              <div class="bg-green-100 p-4 rounded-md">
                <p class="font-bold text-green-800">
                  Best Option: {result.data.cheapest_option}
                </p>
                <p class="text-green-700">
                  You save ${result.data.savings.toFixed(2)} compared to the next
                  best option
                </p>
              </div>

              <!-- Evo Cost -->
              <div class="border border-gray-200 rounded-md overflow-hidden">
                <div class="bg-gray-800 text-white p-3 font-bold">
                  Evo: ${result.data.evo.total.toFixed(2)}
                </div>
                <div class="p-3 space-y-2">
                  <div class="flex justify-between text-sm">
                    <span>Time cost:</span>
                    <span>${result.data.evo.time_cost.toFixed(2)}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span>Fees:</span>
                    <span>${result.data.evo.fees.toFixed(2)}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span>Taxes:</span>
                    <span>${result.data.evo.taxes.toFixed(2)}</span>
                  </div>
                  {#if result.data.evo.discounts > 0}
                    <div class="flex justify-between text-sm text-green-600">
                      <span>Discounts:</span>
                      <span>-${result.data.evo.discounts.toFixed(2)}</span>
                    </div>
                  {/if}
                </div>
              </div>

              <!-- Modo Plus Cost -->
              <div class="border border-gray-200 rounded-md overflow-hidden">
                <div class="bg-gray-800 text-white p-3 font-bold">
                  Modo Plus: ${result.data.modo_plus.total.toFixed(2)}
                </div>
                <div class="p-3 space-y-2">
                  <div class="flex justify-between text-sm">
                    <span>Time cost:</span>
                    <span>${result.data.modo_plus.time_cost.toFixed(2)}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span>Distance cost:</span>
                    <span
                      >${result.data.modo_plus.distance_cost.toFixed(2)}</span
                    >
                  </div>
                  <div class="flex justify-between text-sm">
                    <span>Fees:</span>
                    <span>${result.data.modo_plus.fees.toFixed(2)}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span>Taxes:</span>
                    <span>${result.data.modo_plus.taxes.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <!-- Modo Monthly Cost -->
              <div class="border border-gray-200 rounded-md overflow-hidden">
                <div class="bg-gray-800 text-white p-3 font-bold">
                  Modo Monthly: ${result.data.modo_monthly.total.toFixed(2)}
                </div>
                <div class="p-3 space-y-2">
                  <div class="flex justify-between text-sm">
                    <span>Time cost:</span>
                    <span>${result.data.modo_monthly.time_cost.toFixed(2)}</span
                    >
                  </div>
                  <div class="flex justify-between text-sm">
                    <span>Distance cost:</span>
                    <span
                      >${result.data.modo_monthly.distance_cost.toFixed(
                        2,
                      )}</span
                    >
                  </div>
                  <div class="flex justify-between text-sm">
                    <span>Fees:</span>
                    <span>${result.data.modo_monthly.fees.toFixed(2)}</span>
                  </div>
                  <div class="flex justify-between text-sm">
                    <span>Taxes:</span>
                    <span>${result.data.modo_monthly.taxes.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    {/await}
  {/if}
</div>
