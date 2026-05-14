<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  const projectId = $page.params.id;

  onMount(async () => {
    const params = new URLSearchParams(window.location.search);
    const cod = params.get('cod');
    if (!cod) {
      const el = document.getElementById('status');
      if (el) el.textContent = 'Link de invitație invalid.';
      return;
    }
    const r = await fetch('/api/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cod })
    });
    const data = await r.json();
    const el = document.getElementById('status');
    if (!el) return;
    if (data.error) {
      el.textContent = data.error;
    } else {
      el.textContent = 'V-ați alăturat proiectului cu succes!';
      setTimeout(() => goto(`/projects/${data.proiectId}`), 1500);
    }
  });
</script>

<div class="flex min-h-[50vh] items-center justify-center">
  <div class="rounded-md border border-slate-200 bg-white p-8 text-center">
    <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white text-sm font-bold">Q</div>
    <h1 class="text-sm font-semibold text-slate-900">Alăturare la proiect</h1>
    <p id="status" class="mt-2 text-xs text-slate-500">Se procesează...</p>
  </div>
</div>
