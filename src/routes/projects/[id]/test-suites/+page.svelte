<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { toast } from '$lib/stores/toast';

  let suite: any[] = [];
  let executii: any[] = [];
  let incarcare = true;
  let searchTerm = '';
  let sortBy: 'nume' | 'teste' | 'data' = 'nume';
  let nextCursor: string | null = null;
  let totalSuite = 0;
  let loadingMore = false;
  let execNextCursor: string | null = null;

  let showModal = false;
  let editId: string | null = null;
  let suiteNume = '';
  let suiteDescriere = '';

  const projectId = $page.params.id;

  async function incarca() {
    try {
      const [s, e] = await Promise.all([
        fetch(`/api/projects/${projectId}/test-suites`).then(r => r.json()),
        fetch(`/api/projects/${projectId}/executions`).then(r => r.json())
      ]);
      suite = s.data || [];
      nextCursor = s.nextCursor || null;
      totalSuite = s.total || 0;
      executii = e.data || [];
      execNextCursor = e.nextCursor || null;
    } catch { /* silently handle */ }
    incarcare = false;
  }

  onMount(incarca);

  async function incarcaMaiMulte() {
    if (!nextCursor) return;
    loadingMore = true;
    const r = await fetch(`/api/projects/${projectId}/test-suites?cursor=${nextCursor}`);
    const result = await r.json();
    suite = [...suite, ...(result.data || [])];
    nextCursor = result.nextCursor || null;
    totalSuite = result.total || 0;
    loadingMore = false;
  }

  function ultimaExecutie(suiteId: string): any | null {
    const found = executii.filter(e => e.suiteId === suiteId);
    return found.length > 0 ? found[0] : null;
  }

  function statusCuloare(status: string): string {
    if (status === 'finalizat' || status === 'complet') return 'bg-emerald-400';
    if (status === 'in_progres') return 'bg-amber-400';
    return 'bg-slate-300';
  }

  function statusLabel(status: string): string {
    if (status === 'finalizat' || status === 'complet') return 'Finalizat';
    if (status === 'in_progres') return 'În curs';
    return 'Netestat';
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  $: suiteFiltrate = suite
    .filter(s => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return s.nume?.toLowerCase().includes(term) || s.descriere?.toLowerCase().includes(term);
    })
    .sort((a, b) => {
      if (sortBy === 'nume') return (a.nume || '').localeCompare(b.nume || '');
      if (sortBy === 'teste') return (b._count?.teste || 0) - (a._count?.teste || 0);
      const ea = ultimaExecutie(a.id);
      const eb = ultimaExecutie(b.id);
      return (eb ? new Date(eb.createdAt).getTime() : 0) - (ea ? new Date(ea.createdAt).getTime() : 0);
    });

  $: totalTesteAcoperite = suite.reduce((sum, s) => sum + (s._count?.teste || 0), 0);
  $: suiteCuExecutii = suite.filter(s => ultimaExecutie(s.id)).length;

  function deschideModal(s?: any) {
    if (s) {
      editId = s.id;
      suiteNume = s.nume;
      suiteDescriere = s.descriere || '';
    } else {
      editId = null;
      suiteNume = '';
      suiteDescriere = '';
    }
    showModal = true;
  }

  function inchideModal() {
    suiteNume = ''; suiteDescriere = ''; editId = null; showModal = false;
  }

  async function salveazaSuite() {
    if (!suiteNume.trim()) return;
    if (editId) {
      await fetch(`/api/projects/${projectId}/test-suites/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nume: suiteNume, descriere: suiteDescriere })
      });
    } else {
      await fetch(`/api/projects/${projectId}/test-suites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nume: suiteNume, descriere: suiteDescriere })
      });
    }
    inchideModal();
    toast.success(editId ? 'Suita actualizată' : 'Suită creată');
    await incarca();
  }

  async function stergeSuita(id: string) {
    if (!confirm('Sigur doriți să ștergeți această suită?')) return;
    await fetch(`/api/projects/${projectId}/test-suites/${id}`, { method: 'DELETE' });
    await incarca();
  }

  async function startExecutie(suiteId: string) {
    const r = await fetch(`/api/projects/${projectId}/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suiteId })
    });
    const data = await r.json();
    if (data.error) { toast.error(data.error); return; }
    goto(`/projects/${projectId}/executions/${data.id}`);
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      searchTerm = '';
      (e.target as HTMLInputElement).blur();
    }
  }
</script>

<svelte:window on:keydown={(e) => {
  if (e.key === '/' && !showModal && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'SELECT') {
    e.preventDefault();
    document.getElementById('suite-search')?.focus();
  }
}} />

<div class="space-y-5">
  <!-- Header -->
  <div class="flex items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Suite de Teste</h1>
      <div class="mt-1.5 flex items-center gap-3 text-xs font-mono text-slate-400 tracking-wide">
        <span>{totalSuite || suite.length} suite</span>
        <span class="text-slate-200">|</span>
        <span class="text-amber-600">{totalTesteAcoperite} teste acoperite</span>
        <span class="text-slate-200">|</span>
        <span>{suiteCuExecutii} executate</span>
      </div>
    </div>
    <button on:click={() => deschideModal()} class="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all cursor-pointer">
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      Suită Nouă
    </button>
  </div>

  <!-- Search & Sort -->
  <div class="flex items-center gap-3">
    <div class="relative flex-1 max-w-md">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input
        id="suite-search"
        type="text"
        bind:value={searchTerm}
        on:keydown={handleSearchKeydown}
        placeholder="Caută după nume sau descriere..."
        class="block w-full rounded-md border border-slate-200 bg-white pl-9 pr-16 py-2 text-sm font-mono placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
      />
      <kbd class="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-mono text-slate-400 pointer-events-none">/</kbd>
    </div>
    <div class="h-8 w-px bg-slate-200"></div>
    <select bind:value={sortBy} class="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer">
      <option value="nume">Sortare: Nume</option>
      <option value="teste">Sortare: Nr. teste</option>
      <option value="data">Sortare: Ultima execuție</option>
    </select>
  </div>

  <!-- Suite Cards -->
  {#if incarcare}
    <div class="py-16 text-center">
      <div class="inline-flex items-center gap-2 text-sm text-slate-400">
        <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        Se încarcă...
      </div>
    </div>
  {:else if suite.length === 0}
    <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-20 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
        <svg class="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
      </div>
      <p class="text-sm font-medium text-slate-600">Nicio suită în acest proiect</p>
      <p class="mt-1 text-xs text-slate-400">Grupați teste în suite pentru a le rula împreună</p>
      <button on:click={() => deschideModal()} class="mt-5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all cursor-pointer">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Creează prima suită
      </button>
    </div>
  {:else if suiteFiltrate.length === 0}
    <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
      <p class="text-sm text-slate-500">Nicio suită nu corespunde căutării</p>
      <button on:click={() => searchTerm = ''} class="mt-3 text-xs font-medium text-slate-600 underline underline-offset-2 decoration-slate-300 hover:decoration-slate-500 cursor-pointer">
        Resetează căutarea
      </button>
    </div>
  {:else}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each suiteFiltrate as s (s.id)}
        {@const exec = ultimaExecutie(s.id)}
        {@const testCount = s._count?.teste || 0}
        <div class="group rounded-md border border-slate-200 border-l-[3px] border-l-amber-400 bg-white hover:border-slate-300 transition-colors">
          <!-- Card Body -->
          <div class="px-4 pt-4 pb-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <a href="/projects/{projectId}/test-suites/{s.id}" class="text-sm font-semibold text-slate-800 hover:text-slate-900 hover:underline underline-offset-2 decoration-slate-300 transition-colors">
                  {s.nume}
                </a>
                {#if s.descriere}
                  <p class="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">{s.descriere}</p>
                {/if}
              </div>
            </div>
          </div>

          <!-- Card Meta -->
          <div class="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <!-- Test count -->
              <span class="inline-flex items-center gap-1 text-xs font-mono {testCount > 0 ? 'text-amber-600' : 'text-slate-300'}">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                {testCount} {testCount === 1 ? 'test' : 'teste'}
              </span>

              <!-- Last execution -->
              {#if exec}
                <span class="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400">
                  <span class="h-1.5 w-1.5 rounded-full {statusCuloare(exec.status)}"></span>
                  {statusLabel(exec.status)}
                </span>
              {:else}
                <span class="text-xs font-mono text-slate-300">Neexecutată</span>
              {/if}
            </div>

            <!-- Actions -->
            <div class="flex items-center">
              <button on:click|stopPropagation={() => startExecutie(s.id)} title="Rulează suita" class="flex h-6 w-6 items-center justify-center rounded text-emerald-500 hover:bg-emerald-50 transition-colors cursor-pointer">
                <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </button>
              <button on:click|stopPropagation={() => deschideModal(s)} title="Editează" class="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button on:click|stopPropagation={() => stergeSuita(s.id)} title="Șterge" class="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Footer -->
    <div class="pt-2 text-center">
      {#if nextCursor}
        <div class="pb-3">
          <button on:click={incarcaMaiMulte} disabled={loadingMore} class="text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer disabled:opacity-50">
            {loadingMore ? 'Se încarcă...' : 'Încarcă mai multe'}
          </button>
        </div>
      {/if}
      <span class="text-xs font-mono text-slate-300">{suiteFiltrate.length} suite</span>
    </div>
  {/if}
</div>

<!-- Modal -->
{#if showModal}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" tabindex="-1" on:click={inchideModal} on:keydown={(e) => { if (e.key === 'Escape') inchideModal(); }}>
    <div class="w-full max-w-lg rounded-lg bg-white shadow-2xl" on:click|stopPropagation>
      <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h3 class="text-sm font-semibold text-slate-900">{editId ? 'Editează Suită' : 'Suită Nouă'}</h3>
        <button on:click={inchideModal} class="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="space-y-4 px-6 py-5">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="suiteNume">Nume *</label>
          <input id="suiteNume" type="text" bind:value={suiteNume} class="block w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors" placeholder="Ex: Suite de regresie" />
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="suiteDesc">Descriere</label>
          <textarea id="suiteDesc" bind:value={suiteDescriere} class="block w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors" rows={2} placeholder="Descriere opțională a suitei"></textarea>
        </div>
      </div>
      <div class="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-3">
        <button on:click={inchideModal} class="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">Anulează</button>
        <button on:click={salveazaSuite} class="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer">
          {editId ? 'Salvează' : 'Creează'}
        </button>
      </div>
    </div>
  </div>
{/if}
