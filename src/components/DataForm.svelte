<script lang="ts">
  import { createForm } from "felte";
  import * as z from "zod";
  import { validator } from "@felte/validator-zod";
  import { tripDataStore } from "../stores/tripStore";

  const { onsubmit } = $props();
  const modoPlans = [
    { id: "modo_plus", label: "Modo Plus" },
    { id: "modo_monthly", label: "Modo Monthly" },
    { id: "modo_business", label: "Modo Business" },
  ];
  
  const vehicleOptions = [
    { id: "daily_drive", label: "Daily Drive" },
    { id: "large_loadable", label: "Large & Loadable" },
    { id: "oversized", label: "Oversized" },
  ];

  // Define schema for form validation
  const schema = z.object({
    startDateTime: z.string().min(1, "Start date and time is required"),
    endDateTime: z.string().min(1, "End date and time is required"),
    modoPlan: z.string().min(1, "Modo plan is required"),
    isBcaaMember: z.boolean(),
    distance_km: z.number().min(0, "Distance must be a positive number"),
    vehiclePreference: z.enum(["daily_drive", "large_loadable", "oversized"]).optional(),
    isEv: z.boolean().optional()
  });

  // Create form with Felte
  const { form, errors } = createForm<z.infer<typeof schema>>({
    extend: validator({ schema }),
    initialValues: {
      startDateTime: "",
      endDateTime: "",
      modoPlan: modoPlans[0]!.id,
      isBcaaMember: false,
      distance_km: 5, // Default distance
      vehiclePreference: "daily_drive",
      isEv: false
    },
    onSubmit: (values) => {
      // Process the form data
      const processedData = {
        startDate: new Date(values.startDateTime),
        endDate: new Date(values.endDateTime),
        modoPlan: values.modoPlan,
        isBcaaMember: values.isBcaaMember,
        distance_km: values.distance_km,
        vehiclePreference: values.vehiclePreference,
        isEv: values.isEv
      };
      console.log(processedData);
      
      // Update the store with the new data
      tripDataStore.set(processedData);
      
      // Call the provided onsubmit prop
      onsubmit(processedData);
    }
  });
</script>

<form use:form class="space-y-6">
  <!-- Date/Time Selection -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label for="startDateTime" class="block text-sm text-gray-700">
        Start Date & Time
      </label>
      <input
        type="datetime-local"
        id="startDateTime"
        name="startDateTime"
        class="border-2 border-gray-800 px-2 py-3 bg-transparent w-full"
        required
      />
      {#if $errors.startDateTime}
        <span class="text-red-500 text-sm">{$errors.startDateTime[0]}</span>
      {/if}
    </div>

    <div>
      <label for="endDateTime" class="block text-sm text-gray-700">
        End Date & Time
      </label>
      <input
        type="datetime-local"
        id="endDateTime"
        name="endDateTime"
        class="border-2 border-gray-800 px-2 py-3 bg-transparent w-full"
        required
      />
      {#if $errors.endDateTime}
        <span class="text-red-500 text-sm">{$errors.endDateTime[0]}</span>
      {/if}
    </div>
  </div>

  <!-- Distance input -->
  <div>
    <label for="distance_km" class="block text-sm text-gray-700">
      Distance (km)
    </label>
    <input
      type="number"
      id="distance_km"
      name="distance_km"
      min="0"
      class="border-2 border-gray-800 px-2 py-3 bg-transparent w-full"
      required
    />
    {#if $errors.distance_km}
      <span class="text-red-500 text-sm">{$errors.distance_km[0]}</span>
    {/if}
  </div>

  <!-- Vehicle Preference -->
  <div>
    <label for="vehiclePreference" class="block text-sm text-gray-700">
      Vehicle Preference
    </label>
    <select
      id="vehiclePreference"
      name="vehiclePreference"
      class="border-2 border-gray-800 px-2 py-3 bg-transparent w-full"
    >
      {#each vehicleOptions as option}
        <option value={option.id}>{option.label}</option>
      {/each}
    </select>
  </div>

  <!-- Modo Plan Selector -->
  <div>
    <label for="modoPlan" class="block text-sm text-gray-700">
      Modo Membership Plan
    </label>
    <select
      id="modoPlan"
      name="modoPlan"
      class="border-2 border-gray-800 px-2 py-3 bg-transparent w-full"
    >
      {#each modoPlans as plan}
        <option value={plan.id}>{plan.label}</option>
      {/each}
    </select>
    {#if $errors.modoPlan}
      <span class="text-red-500 text-sm">{$errors.modoPlan[0]}</span>
    {/if}
  </div>

  <!-- Options group -->
  <div class="space-y-3">
    <!-- BCAA Member Toggle -->
    <div class="flex items-center space-x-3">
      <input
        type="checkbox"
        id="isBcaaMember"
        name="isBcaaMember"
        class="h-5 w-5 border-2 border-gray-800"
      />
      <label for="isBcaaMember" class="text-sm text-gray-700">
        BCAA Member
      </label>
    </div>

    <!-- Electric Vehicle Toggle -->
    <div class="flex items-center space-x-3">
      <input
        type="checkbox"
        id="isEv"
        name="isEv"
        class="h-5 w-5 border-2 border-gray-800"
      />
      <label for="isEv" class="text-sm text-gray-700">
        Electric Vehicle
      </label>
    </div>
  </div>

  <button
    type="submit"
    class="bg-gray-800 text-orange-50 w-full px-2 py-3 uppercase"
  >
    Calculate Pricing
  </button>
</form>
