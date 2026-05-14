<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  onMount(() => {
    goto(`/projects/${$page.params.id}/dashboard`, { replaceState: true });
  });
</script>

<div class="flex items-center justify-center py-20">
  <p class="text-sm text-slate-400">Redirecționare...</p>
</div>
