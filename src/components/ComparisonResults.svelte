<script lang="ts">
  import { comparisonResultStore } from "../stores/tripStore";
  import type { ComparisonResult } from "../calculations";

  // Subscribe to the store
  let comparisonResult = $state<ComparisonResult | null>(null);

  // Set up the subscription
  comparisonResultStore.subscribe((value) => {
    comparisonResult = value;
  });

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  }

  // Function to determine badge color based on option name
  function getBadgeColor(optionName: string): string {
    const colors = {
      Evo: "bg-blue-100 text-blue-800",
      "Modo Plus": "bg-green-100 text-green-800",
      "Modo Monthly": "bg-purple-100 text-purple-800",
      "Modo Business": "bg-orange-100 text-orange-800",
    };
    return (
      colors[optionName as keyof typeof colors] || "bg-gray-100 text-gray-800"
    );
  }
</script>

{#if comparisonResult}
  <div class="space-y-8">
    <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
      <h2 class="text-2xl font-bold text-gray-900 mb-4">Best Option</h2>

      <div class="flex items-center space-x-3 mb-4">
        <span
          class={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getBadgeColor(comparisonResult.cheapest_option)}`}
        >
          {comparisonResult.cheapest_option}
        </span>
        <span class="text-2xl font-bold">
          {formatCurrency(
            comparisonResult.cheapest_option === "Evo"
              ? comparisonResult.evo.total
              : comparisonResult.cheapest_option === "Modo Plus"
                ? comparisonResult.modo_plus.total
                : comparisonResult.cheapest_option === "Modo Monthly"
                  ? comparisonResult.modo_monthly.total
                  : comparisonResult.modo_business.total,
          )}
        </span>
      </div>

      <div class="bg-green-50 border border-green-200 rounded-lg p-4">
        <div class="flex items-center">
          <svg
            class="w-5 h-5 text-green-500 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clip-rule="evenodd"
            ></path>
          </svg>
          <p class="text-green-700">
            You save {formatCurrency(comparisonResult.savings)} compared to the next
            cheapest option
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Evo Card -->
      <div class="border border-gray-200 rounded-lg overflow-hidden">
        <div class="bg-blue-50 px-4 py-3 border-b border-gray-200">
          <h3 class="text-lg font-medium text-blue-800">Evo</h3>
        </div>
        <div class="p-4 space-y-4">
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">Time Cost</span>
            <span class="font-medium"
              >{formatCurrency(comparisonResult.evo.time_cost)}</span
            >
          </div>
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">Distance Cost</span>
            <span class="font-medium"
              >{formatCurrency(comparisonResult.evo.distance_cost)}</span
            >
          </div>
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">Fees</span>
            <span class="font-medium"
              >{formatCurrency(comparisonResult.evo.fees)}</span
            >
          </div>
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">Taxes</span>
            <span class="font-medium"
              >{formatCurrency(comparisonResult.evo.taxes)}</span
            >
          </div>
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">Discounts</span>
            <span class="font-medium text-green-600"
              >-{formatCurrency(comparisonResult.evo.discounts)}</span
            >
          </div>
          <div class="flex justify-between pt-2">
            <span class="text-lg font-bold">Total</span>
            <span class="text-lg font-bold"
              >{formatCurrency(comparisonResult.evo.total)}</span
            >
          </div>
        </div>
      </div>

      <!-- Modo Card -->
      <div class="border border-gray-200 rounded-lg overflow-hidden">
        <div class="bg-green-50 px-4 py-3 border-b border-gray-200">
          <h3 class="text-lg font-medium text-green-800">
            Modo ({comparisonResult.cheapest_option.includes("Modo")
              ? comparisonResult.cheapest_option.split(" ")[1]
              : "Plus"})
          </h3>
        </div>
        <div class="p-4 space-y-4">
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">Time Cost</span>
            <span class="font-medium"
              >{formatCurrency(
                comparisonResult.cheapest_option === "Modo Plus"
                  ? comparisonResult.modo_plus.time_cost
                  : comparisonResult.cheapest_option === "Modo Monthly"
                    ? comparisonResult.modo_monthly.time_cost
                    : comparisonResult.modo_business.time_cost,
              )}</span
            >
          </div>
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">Distance Cost</span>
            <span class="font-medium"
              >{formatCurrency(
                comparisonResult.cheapest_option === "Modo Plus"
                  ? comparisonResult.modo_plus.distance_cost
                  : comparisonResult.cheapest_option === "Modo Monthly"
                    ? comparisonResult.modo_monthly.distance_cost
                    : comparisonResult.modo_business.distance_cost,
              )}</span
            >
          </div>
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">Fees</span>
            <span class="font-medium"
              >{formatCurrency(
                comparisonResult.cheapest_option === "Modo Plus"
                  ? comparisonResult.modo_plus.fees
                  : comparisonResult.cheapest_option === "Modo Monthly"
                    ? comparisonResult.modo_monthly.fees
                    : comparisonResult.modo_business.fees,
              )}</span
            >
          </div>
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">Taxes</span>
            <span class="font-medium"
              >{formatCurrency(
                comparisonResult.cheapest_option === "Modo Plus"
                  ? comparisonResult.modo_plus.taxes
                  : comparisonResult.cheapest_option === "Modo Monthly"
                    ? comparisonResult.modo_monthly.taxes
                    : comparisonResult.modo_business.taxes,
              )}</span
            >
          </div>
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-600">Discounts</span>
            <span class="font-medium text-green-600"
              >-{formatCurrency(
                comparisonResult.cheapest_option === "Modo Plus"
                  ? comparisonResult.modo_plus.discounts
                  : comparisonResult.cheapest_option === "Modo Monthly"
                    ? comparisonResult.modo_monthly.discounts
                    : comparisonResult.modo_business.discounts,
              )}</span
            >
          </div>
          <div class="flex justify-between pt-2">
            <span class="text-lg font-bold">Total</span>
            <span class="text-lg font-bold"
              >{formatCurrency(
                comparisonResult.cheapest_option === "Modo Plus"
                  ? comparisonResult.modo_plus.total
                  : comparisonResult.cheapest_option === "Modo Monthly"
                    ? comparisonResult.modo_monthly.total
                    : comparisonResult.modo_business.total,
              )}</span
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Details/Explanation -->
    <div class="border border-gray-200 rounded-lg overflow-hidden">
      <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 class="text-lg font-medium">Calculation Details</h3>
      </div>
      <div class="p-4">
        <div class="space-y-2">
          <h4 class="font-medium text-blue-800">Evo</h4>
          <ul class="list-disc pl-5 space-y-1">
            {#each comparisonResult.evo.details as detail}
              <li class="text-sm text-gray-600">{detail}</li>
            {/each}
          </ul>
        </div>

        <div class="mt-4 pt-4 border-t border-gray-200 space-y-2">
          <h4 class="font-medium text-green-800">
            Modo ({comparisonResult.cheapest_option.includes("Modo")
              ? comparisonResult.cheapest_option.split(" ")[1]
              : "Plus"})
          </h4>
          <ul class="list-disc pl-5 space-y-1">
            {#each comparisonResult.cheapest_option === "Modo Plus"
              ? comparisonResult.modo_plus.details
              : comparisonResult.cheapest_option === "Modo Monthly"
                ? comparisonResult.modo_monthly.details
                : comparisonResult.modo_business.details as detail}
              <li class="text-sm text-gray-600">{detail}</li>
            {/each}
          </ul>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="bg-gray-50 p-6 border border-gray-200 rounded-lg text-center">
    <p class="text-gray-600">
      Enter trip details above and click "Calculate Pricing" to see comparison
      results.
    </p>
  </div>
{/if}
