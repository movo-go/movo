<script lang="ts">
  import Form from "./Form.svelte";

  async function waitForMapKit() {
    if (window.mapkit && window.mapkit.loadedLibraries.length !== 0) {
      return;
    }
    await new Promise<void>((resolve) => {
      window.initMapKit = resolve;
    });
    delete window.initMapKit;
  }

  const ready = waitForMapKit();
</script>

{#await ready}
  <div>Loading...</div>
{:then}
  <Form />
{/await}
