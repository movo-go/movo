<script lang="ts">
    import type { HTMLAttributes } from "svelte/elements";

    interface Props extends HTMLAttributes<HTMLDivElement> {
        options?: mapkit.MapConstructorOptions | undefined;
    }

    const { options, ...props }: Props = $props();

    let element: HTMLDivElement;
    let map: mapkit.Map;

    $effect(() => {
        map = new mapkit.Map(element, options);
        return () => {
            map.destroy();
        };
    });
</script>

<div {...props} bind:this={element}></div>
