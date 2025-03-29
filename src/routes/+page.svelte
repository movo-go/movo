<script lang="ts">
  import TripLayout from "../components/TripLayout.svelte";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
</script>

<TripLayout homezones={data.homezones} />
