<script lang="ts">
  import Address from "./Address.svelte";
  import type { ComparisonCalc, TripState } from "./TripTypes";
  // Get current location on component mount
  type ExpandedStage = "mini" | "partial" | "full";
  // Update the map with coordinates
  let {
    originCoordinate = $bindable(),
    destinationCoordinate = $bindable(),
    stayDuration = $bindable(),
    bcaaMembership = $bindable(),
    electricVehicle = $bindable(),
    roundTripRequired = $bindable(),
    vehicleType = $bindable(),
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

  $inspect(roundTripRequired);
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
  function toggleExpandedStage(stage: ExpandedStage) {
    if (stage === "mini") {
      return "partial";
    }
    if (stage === "partial") {
      return "full";
    }
    return "mini";
  }
  // Add toggle state variables for each card
  let evoExpandedStage = $state<ExpandedStage>("mini");
  let modoMonthlyExpandedStage = $state<ExpandedStage>("mini");
  let modoPlusExpandedStage = $state<ExpandedStage>("mini");

  type CostOption = {
    label: string;
    total: number;
    details: string[];
    time_cost: number;
    distance_cost?: number;
    fees: number;
    taxes: number;
    discounts?: number;
    expandedStage: ExpandedStage;
    setExpandedStage: (stage: ExpandedStage) => void;
  };

  function editForm() {
    isFormView = true;
    evoExpandedStage = "mini";
    modoMonthlyExpandedStage = "mini";
    modoPlusExpandedStage = "mini";
  }
</script>

<div class="w-full h-full overflow-y-auto p-5 bg-stone-50 shadow-md">
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
        <div>
          <label
            for="round-trip-required"
            class="block text-sm text-gray-700 font-medium"
          >
            Round Trip Required
          </label>
          <input
            id="round-trip-required"
            type="checkbox"
            bind:checked={roundTripRequired}
          />
        </div>
        <div>
          <label
            for="bcaa-membership"
            class="block text-sm text-gray-700 font-medium"
          >
            BCAA Membership
          </label>
          <input
            id="bcaa-membership"
            type="checkbox"
            bind:checked={bcaaMembership}
          />
        </div>
        <div>
          <label
            for="electric-vehicle"
            class="block text-sm text-gray-700 font-medium"
          >
            Electric Vehicle
          </label>
          <input
            id="electric-vehicle"
            type="checkbox"
            bind:checked={electricVehicle}
          />
        </div>
        <div>
          <label
            for="vehicle-type"
            class="block text-sm text-gray-700 font-medium"
          >
            Vehicle Type
          </label>
          <select
            id="vehicle-type"
            bind:value={vehicleType}
            class="border-2 border-gray-800 px-2 py-3 bg-transparent w-full mt-1"
          >
            <option value="daily_drive">Daily Drive</option>
            <option value="large_loadable">Large Loadable</option>
            <option value="oversized">Oversized</option>
          </select>
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
      <div class="flex justify-center items-center h-full">
        <div class="flex flex-col items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="animate-spin w-14 h-14"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <div class="text-gray-800">Calculating All of the Things...</div>
        </div>
      </div>
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
              onclick={editForm}
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
              <span>{result.data.distance_km?.toFixed(1)} km</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium">Travel Time:</span>
              <span
                >{Math.round(result.data.travel_time_minutes_one_way)} minutes (one
                way)</span
              >
            </div>
            <div class="flex justify-between">
              <span class="font-medium">Stay Duration:</span>
              <span>{stayDuration ?? 0} minutes</span>
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

              {#snippet costCard(option: CostOption)}
                <div class="border border-gray-200 rounded-md overflow-hidden">
                  <button
                    class="w-full bg-gray-800 text-white p-3 font-bold flex justify-between items-center cursor-pointer"
                    onclick={() =>
                      option.setExpandedStage(
                        toggleExpandedStage(option.expandedStage),
                      )}
                  >
                    <span>{option.label}: ${option.total.toFixed(2)}</span>

                    {#if option.expandedStage === "mini"}
                      <!-- Three dots icon -->
                      <svg
                        class="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="6" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="18" cy="12" r="2" />
                      </svg>
                    {:else if option.expandedStage === "partial"}
                      <!-- Two dots icon -->
                      <svg
                        class="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle cx="9" cy="12" r="2" />
                        <circle cx="15" cy="12" r="2" />
                      </svg>
                    {:else}
                      <!-- X icon -->
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    {/if}
                  </button>

                  {#if option.expandedStage === "full"}
                    <div class="p-3 bg-inherit">
                      <div
                        class="border border-gray-200 bg-gray-200 rounded-md p-1 flex flex-col gap-1"
                      >
                        {#each option.details as detail}
                          <span class="text-sm">{detail}</span>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  {#if option.expandedStage === "partial" || option.expandedStage === "full"}
                    <div class="p-3 space-y-2 bg-inherit">
                      <div class="flex justify-between text-sm">
                        <span>Time cost:</span>
                        <span>${option.time_cost.toFixed(2)}</span>
                      </div>
                      {#if option.distance_cost !== undefined}
                        <div class="flex justify-between text-sm">
                          <span>Distance cost:</span>
                          <span>${option.distance_cost.toFixed(2)}</span>
                        </div>
                      {/if}
                      <div class="flex justify-between text-sm">
                        <span>Fees:</span>
                        <span>${option.fees.toFixed(2)}</span>
                      </div>
                      <div class="flex justify-between text-sm">
                        <span>Taxes:</span>
                        <span>${option.taxes.toFixed(2)}</span>
                      </div>
                      {#if option.discounts && option.discounts > 0}
                        <div
                          class="flex justify-between text-sm text-green-600"
                        >
                          <span>Discounts:</span>
                          <span>-${option.discounts.toFixed(2)}</span>
                        </div>
                      {/if}
                    </div>
                  {/if}

                  <!-- Always visible summary footer -->
                  <div class="p-3 border-t border-gray-200 bg-white">
                    <div class="flex justify-between font-medium">
                      <span>Total Cost:</span>
                      <span>${option.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              {/snippet}

              <!-- Evo Card -->
              {@render costCard({
                label: "Evo",
                ...result.data.evo,
                expandedStage: evoExpandedStage,
                setExpandedStage: (stage) => (evoExpandedStage = stage),
              })}

              <!-- Modo Plus Card -->
              {@render costCard({
                label: "Modo Plus",
                ...result.data.modo_plus,
                expandedStage: modoPlusExpandedStage,
                setExpandedStage: (stage) => (modoPlusExpandedStage = stage),
              })}

              <!-- Modo Monthly Card -->
              {@render costCard({
                label: "Modo Monthly",
                ...result.data.modo_monthly,
                expandedStage: modoMonthlyExpandedStage,
                setExpandedStage: (stage) => (modoMonthlyExpandedStage = stage),
              })}
            </div>
          </div>
        </div>
      {/if}
    {/await}
  {/if}
</div>
