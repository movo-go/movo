<script lang="ts">
  import {
    createCombobox,
    melt,
    type ComboboxOptionProps,
  } from "@melt-ui/svelte";
  import { fly } from "svelte/transition";
  import type { MeltEventHandler } from "@melt-ui/svelte/internal/types";
  import { getMapKit } from "../utilities/mapkit";
  import type { HTMLInputAttributes } from "svelte/elements";
  import { nanoid } from "nanoid";
  import { cn } from "../utilities/cn";

  type Props = Omit<HTMLInputAttributes, "type">;

  const { id: explicitId, class: className, ...restProps }: Props = $props();
  const id = explicitId ?? nanoid();

  const {
    elements: { label, input, menu, option },
    states: { open, inputValue },
  } = createCombobox<mapkit.SearchAutocompleteResult>({
    forceVisible: true,
    onSelectedChange: ({ next }) => {
      if (next) {
        $inputValue = next.value.displayLines.join(" ");
      }
      return next;
    },
  });

  const toOption = (
    result: mapkit.SearchAutocompleteResult,
  ): ComboboxOptionProps<mapkit.SearchAutocompleteResult> => ({
    value: result,
    label: result.displayLines.join(" "),
  });

  let search: mapkit.Search | undefined;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let currentSearch: number | undefined;
  let results = $state<mapkit.SearchAutocompleteResult[]>([]);

  const handleInput: MeltEventHandler<Event> = (e) => {
    const value = (e.currentTarget as HTMLInputElement).value;

    clearTimeout(debounceTimer);
    if (currentSearch) {
      search?.cancel(currentSearch);
    }

    debounceTimer = setTimeout(async () => {
      if (!value) {
        results = [];
        return;
      }

      if (!search) {
        const mk = await getMapKit();
        search = new mk.Search({
          getsUserLocation: true,
          includeQueries: false,
          includePointsOfInterest: true,
          includeAddresses: true,
        });
      }

      currentSearch = search.autocomplete(value, (error, response) => {
        if (error) {
          console.error(error);
          return;
        }
        results = response.results;
      });
    }, 200);
  };
</script>

<div>
  <label use:melt={$label} for={id} class="block text-sm text-gray-700">
    Destination Address
  </label>
  <!-- svelte-ignore event_directive_deprecated -->
  <input
    {...restProps}
    use:melt={$input}
    on:m-input={handleInput}
    {id}
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
        class="p-2 rounded-md cursor-pointer hover:bg-orange-50 data-[highlighted]:bg-orange-50"
      >
        {#each result.displayLines as line, index (index)}
          <p class:text-sm={index !== 0}>{line}</p>
        {/each}
      </li>
    {/each}
  </ul>
{/if}
