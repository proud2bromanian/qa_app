<script lang="ts">
  import { goto } from '$app/navigation';

  let nume = '';
  let descriere = '';
  let eroare = '';
  let incarcare = false;

  async function handleSubmit(e: Event) {
    e.preventDefault();
    eroare = '';
    incarcare = true;
    try {
      const r = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nume, descriere })
      });
      const data = await r.json();
      if (!r.ok) { eroare = data.error; return; }
      goto(`/projects/${data.id}`);
    } catch { eroare = 'Eroare de conexiune'; }
    finally { incarcare = false; }
  }
</script>

<div class="mx-auto max-w-lg">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Proiect Nou</h1>
    <p class="mt-1 text-xs text-slate-400">Creați un nou proiect de testare</p>
  </div>

  <form on:submit={handleSubmit} class="rounded-md border border-slate-200 bg-white p-6 space-y-4">
    {#if eroare}
      <div class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">{eroare}</div>
    {/if}
    <div>
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="nume">Nume proiect *</label>
      <input id="nume" type="text" bind:value={nume} class="block w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors" required placeholder="Numele proiectului" />
    </div>
    <div>
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="descriere">Descriere</label>
      <textarea id="descriere" bind:value={descriere} class="block w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors" rows={3} placeholder="Descriere opțională"></textarea>
    </div>
    <div class="flex justify-end gap-2 pt-2">
      <a href="/projects" class="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">Anulează</a>
      <button type="submit" disabled={incarcare} class="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
        {incarcare ? 'Se creează...' : 'Creează proiect'}
      </button>
    </div>
  </form>
</div>
