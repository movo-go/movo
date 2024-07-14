<script lang="ts">
  import { createForm } from "felte";
  import {
    createCombobox,
    melt,
    type ComboboxOptionProps,
  } from "@melt-ui/svelte";
  import { fly } from "svelte/transition";

  const { form } = createForm();

  const {
    elements: { label, input, menu, option },
    states: { open, inputValue },
  } = createCombobox({
    forceVisible: true,
  });

  const toOption = (
    result: mapkit.SearchAutocompleteResult,
  ): ComboboxOptionProps<mapkit.SearchAutocompleteResult> => ({
    value: result,
    label: result.displayLines[0] ?? "",
  });

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const debounce = (callback: () => void) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(callback, 200);
  };

  const search = new mapkit.Search({
    getsUserLocation: true,
    includeQueries: false,
    includePointsOfInterest: true,
    includeAddresses: true,
  });
  let results = $state<mapkit.SearchAutocompleteResult[]>([]);

  $effect(() => {
    const searchQuery = $inputValue;
    debounce(() => {
      if (!searchQuery) {
        results = [];
        return;
      }
      search.autocomplete($inputValue, (error, response) => {
        if (error) {
          console.error(error);
          return;
        }
        results = response.results;
      });
    });
  });

  $effect(() => {
    const map = new mapkit.Map("map", {
      showsUserLocation: true,
      tracksUserLocation: true,
      showsUserLocationControl: true,
    });

    return () => {
      map.destroy();
    };
  });
</script>

<form use:form class="p-4">
  <div class="space-y-2">
    <label use:melt={$label} for="address" class="block">Address</label>
    <input
      use:melt={$input}
      type="text"
      name="address"
      id="address"
      class="p-2 rounded-lg border shadow-inner w-1/2"
    />
  </div>
</form>

<div id="map" class="size-96"></div>

{#if $open}
  <ul
    use:melt={$menu}
    transition:fly={{ y: -5, duration: 100 }}
    class="rounded-lg shadow-lg p-1 bg-gray-50 border border-gray-100"
  >
    {#each results as result, index (index)}
      <li
        use:melt={$option(toOption(result))}
        class="p-2 rounded-md cursor-pointer hover:bg-blue-300 data-[highlighted]:bg-blue-400"
      >
        {#each result.displayLines as line, index (index)}
          <p>{line}</p>
        {/each}
      </li>
    {:else}
      {#if $inputValue}
        <div class="p-2">No results found</div>
      {:else}
        <div class="p-2">Start typing to search</div>
      {/if}
    {/each}
  </ul>
{/if}
