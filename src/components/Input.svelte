<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  type Props = {
    labelText: string;
    placeholder: string;
  } & HTMLInputAttributes;

  let {
    labelText,
    placeholder,
    value = $bindable(),
    ...rest
  }: Props = $props();
</script>

<div>
  <label class="hidden md:block text-sm text-gray-700" for={rest.id}>
    {labelText}
  </label>
  <input
    bind:value
    {...rest}
    type="text"
    class=" border-2 border-gray-800 p-1 md:px-2 md:py-3 bg-transparent w-full"
    {placeholder}
  />
</div>
