<script lang="ts">
  import Form from "./Form.svelte";
  import { getMapKit } from "../utilities/mapkit";
</script>

{#await getMapKit()}
  <div>Loading...</div>
{:then}
  <Form />
{/await}
