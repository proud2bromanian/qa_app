<script lang="ts">
  import { onMount } from 'svelte';
  import { currentUser } from '$lib/stores/auth';
  import { goto } from '$app/navigation';

  onMount(() => {
    const unsub = currentUser.subscribe(u => {
      if (u) goto('/dashboard');
      else goto('/login');
    });
    return unsub;
  });
</script>
