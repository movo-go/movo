<script lang="ts">
  import { createForm } from "felte";
  import Address from "./Address.svelte";
  import * as z from "zod";
  import { validator } from "@felte/validator-zod";

  const schema = z.object({
    address: z.string().min(1),
    duration: z.string().min(1),
  })

  const { form } = createForm<z.infer<typeof schema>>({
    extend: validator({ schema }),
    onSubmit: (data) => {
      console.log(data);
    }
  });
</script>

<form use:form class="space-y-16">
  <div class="space-y-8">
    <Address name="address" id="address" placeholder="e.g. 1075 Nelson St" required />

    <div>
      <label for="duration" class="block text-sm text-gray-700">
        Length of Stay
      </label>
      <input
        type="time"
        name="duration"
        id="duration"
        value="14:00"
        required
        class="border-2 border-gray-800 px-2 py-3 bg-transparent w-full"
      />
    </div>
  </div>

  <button type="submit" class="bg-gray-800 text-orange-50 w-full px-2 py-3 uppercase">
    I'm Feeling Lucky
  </button>
</form>
