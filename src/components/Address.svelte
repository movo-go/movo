<script lang="ts">
  import {
    createCombobox,
    melt,
    type ComboboxOptionProps,
  } from "@melt-ui/svelte";
  import { fly } from "svelte/transition";
  import { getMapKit } from "../utilities/mapkit";
  import type { HTMLInputAttributes } from "svelte/elements";
  import { nanoid } from "nanoid";
  import { cn } from "../utilities/cn";
  import { onMount } from "svelte";
  import { createField } from "felte";

  type Props = Omit<HTMLInputAttributes, "type">;

  const {
    id: explicitId,
    name,
    class: className,
    ...restProps
  }: Props = $props();
  const id = explicitId ?? nanoid();

  const { field, onChange, onBlur } = createField(name ?? id);

  const {
    elements: { label, input, menu, option },
    states: { open, touchedInput, inputValue },
  } = createCombobox<string>({
    forceVisible: true,
    onSelectedChange: ({ next }) => {
      onChange(next?.value);
      if (next) {
        $inputValue = next.value;
      }
      return next;
    },
  });

  const toOption = (
    result: mapkit.SearchAutocompleteResult,
  ): ComboboxOptionProps<string> => ({
    value: result.displayLines.join(" "),
  });

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  const debounce = (callback: () => void) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(callback, 200);
  };

  let currentSearch: number | undefined;
  let results = $state<mapkit.SearchAutocompleteResult[]>([]);
  let search = $state<mapkit.Search>();

  onMount(async () => {
    const mk = await getMapKit();
    search = new mk.Search({
      getsUserLocation: true,
      includeQueries: false,
      includePointsOfInterest: true,
      includeAddresses: true,
    });
  });

  $effect(() => {
    const capturedSearch = search;
    const value = $inputValue;

    if (!$touchedInput) return;
    if (!capturedSearch) return;

    debounce(() => {
      if (currentSearch) {
        capturedSearch.cancel(currentSearch);
      }

      currentSearch = capturedSearch.autocomplete(value, (error, response) => {
        if (error) {
          console.error(error);
          return;
        }
        results = response.results;
      });
    });
  });
</script>

<div>
  <label use:melt={$label} for={id} class="block text-sm text-gray-700">
    Destination Address
  </label>
  <input
    {...restProps}
    use:field
    use:melt={$input}
    {id}
    onblur={(event) => {
      onBlur();
      restProps.onblur?.(event);
    }}
    type="text"
    class={cn(
      "border-2 border-gray-800 px-2 py-3 bg-transparent w-full",
      className,
    )}
  />
</div>

{#if $open && results.length > 0}
  <ul
    use:melt={$menu}
    transition:fly={{ y: -10, duration: 150 }}
    class="bg-white border-2 border-gray-800 shadow-2xl p-2 min-h-64 max-h-80 overflow-y-auto"
  >
    {#each results as result, index (index)}
      <li
        use:melt={$option(toOption(result))}
        class="p-2 rounded-md cursor-pointer hover:bg-orange-50 data-highlighted:bg-orange-50"
      >
        {#each result.displayLines as line, index (index)}
          <p class:text-sm={index !== 0}>{line}</p>
        {/each}
      </li>
    {/each}
  </ul>
{/if}
