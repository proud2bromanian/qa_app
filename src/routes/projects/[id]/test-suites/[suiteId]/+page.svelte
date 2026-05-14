<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { slide } from 'svelte/transition';
  import { toast } from '$lib/stores/toast';

  let suita: any = null;
  let toateTestele: any[] = [];
  let incarcare = true;
  let selectedTestIds: string[] = [];
  let searchAvailable = '';
  let searchSelected = '';
  let saving = false;
  let saved = false;
  let nextCursor: string | null = null;
  let totalTeste = 0;
  let loadingMore = false;

  const projectId = $page.params.id;
  const suiteId = $page.params.suiteId;

  onMount(async () => {
    try {
      const [s, t] = await Promise.all([
        fetch(`/api/projects/${projectId}/test-suites/${suiteId}`).then(r => r.json()),
        fetch(`/api/projects/${projectId}/test-cases`).then(r => r.json())
      ]);
      if (s.error) return;
      suita = s;
      toateTestele = t.data || [];
      nextCursor = t.nextCursor || null;
      totalTeste = t.total || 0;
      selectedTestIds = s.teste?.map((st: any) => st.testId) || [];
    } catch { /* silently handle */ }
    incarcare = false;
  });

  async function incarcaMaiMulte() {
    if (!nextCursor) return;
    loadingMore = true;
    const r = await fetch(`/api/projects/${projectId}/test-cases?cursor=${nextCursor}`);
    const result = await r.json();
    toateTestele = [...toateTestele, ...(result.data || [])];
    nextCursor = result.nextCursor || null;
    totalTeste = result.total || 0;
    loadingMore = false;
  }

  function toggleTest(testId: string) {
    if (selectedTestIds.includes(testId)) {
      selectedTestIds = selectedTestIds.filter(id => id !== testId);
    } else {
      selectedTestIds = [...selectedTestIds, testId];
    }
    saved = false;
  }

  function selecteazaToate() {
    const filteredIds = testeDisponibile.map(t => t.id);
    selectedTestIds = [...new Set([...selectedTestIds, ...filteredIds])];
    saved = false;
  }

  function deselecteazaToate() {
    selectedTestIds = [];
    saved = false;
  }

  function mutaSus(idx: number) {
    if (idx === 0) return;
    const arr = [...selectedTestIds];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    selectedTestIds = arr;
    saved = false;
  }

  function mutaJos(idx: number) {
    if (idx >= selectedTestIds.length - 1) return;
    const arr = [...selectedTestIds];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    selectedTestIds = arr;
    saved = false;
  }

  $: testeDisponibile = toateTestele
    .filter(t => !selectedTestIds.includes(t.id))
    .filter(t => {
      if (!searchAvailable) return true;
      const term = searchAvailable.toLowerCase();
      return t.titlu?.toLowerCase().includes(term) || t.cod?.toLowerCase().includes(term) || t.mediu?.toLowerCase().includes(term);
    })
    .sort((a, b) => {
      const na = parseInt(a.cod?.replace('TC-', '') || '0', 10);
      const nb = parseInt(b.cod?.replace('TC-', '') || '0', 10);
      return na - nb;
    });

  $: testeSelectate = selectedTestIds
    .map(id => toateTestele.find(t => t.id === id))
    .filter(Boolean)
    .filter(t => {
      if (!searchSelected) return true;
      const term = searchSelected.toLowerCase();
      return t.titlu?.toLowerCase().includes(term) || t.cod?.toLowerCase().includes(term) || t.mediu?.toLowerCase().includes(term);
    });

  async function salveazaSelectia() {
    saving = true;
    const r = await fetch(`/api/projects/${projectId}/test-suites/${suiteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teste: selectedTestIds })
    });
    const data = await r.json();
    if (data.error) { toast.error(data.error); saving = false; return; }
    suita = data;
    saved = true;
    saving = false;
    toast.success('Salvat cu succes');
  }

  async function startExecutie() {
    if (selectedTestIds.length === 0) { toast.error('Selectați cel puțin un test'); return; }
    const r = await fetch(`/api/projects/${projectId}/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suiteId,
        testIds: selectedTestIds,
        nume: `Execuție ${suita?.nume || ''} ${new Date().toLocaleDateString('ro-RO')}`
      })
    });
    const exec = await r.json();
    if (exec.error) { toast.error(exec.error); return; }
    goto(`/projects/${projectId}/executions/${exec.id}`);
  }
</script>

<div class="space-y-5">
  <!-- Header -->
  <div>
    <a href="/projects/{projectId}/test-suites" class="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors">
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      Înapoi la suite
    </a>
    {#if suita}
      <div class="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">{suita.nume}</h1>
          {#if suita.descriere}
            <p class="mt-1 text-sm text-slate-400">{suita.descriere}</p>
          {/if}
        </div>
        <div class="flex gap-2 shrink-0">
          <button on:click={salveazaSelectia} disabled={saving} class="inline-flex items-center gap-1.5 rounded-md {saved ? 'bg-emerald-600' : 'bg-slate-900'} px-3.5 py-2 text-xs font-semibold text-white hover:opacity-90 transition-all cursor-pointer disabled:opacity-50">
            {#if saving}
              <svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Se salvează...
            {:else if saved}
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              Salvat
            {:else}
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
              Salvează
            {/if}
          </button>
          <button on:click={startExecutie} class="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-all cursor-pointer">
            <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            Rulează
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Counter Bar -->
  {#if !incarcare && suita}
    <div class="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-4 py-2.5">
      <div class="flex items-center gap-4">
        <span class="text-xs font-mono text-slate-600">
          <span class="font-semibold {selectedTestIds.length > 0 ? 'text-amber-600' : 'text-slate-400'}">{selectedTestIds.length}</span>
          <span class="text-slate-400"> selectate din </span>
          <span class="text-slate-600">{toateTestele.length}</span>
          <span class="text-slate-400"> teste</span>
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button on:click={selecteazaToate} disabled={testeDisponibile.length === 0} class="text-xs font-medium text-slate-500 hover:text-slate-800 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors cursor-pointer">
          Selectează toate
        </button>
        <span class="text-slate-200">·</span>
        <button on:click={deselecteazaToate} disabled={selectedTestIds.length === 0} class="text-xs font-medium text-slate-500 hover:text-slate-800 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors cursor-pointer">
          Deselectează
        </button>
      </div>
    </div>
  {/if}

  <!-- Main Content -->
  {#if incarcare}
    <div class="py-16 text-center">
      <div class="inline-flex items-center gap-2 text-sm text-slate-400">
        <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        Se încarcă...
      </div>
    </div>
  {:else if !suita}
    <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
      <p class="text-sm text-slate-500">Suita nu a fost găsită</p>
    </div>
  {:else if toateTestele.length === 0}
    <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
      <p class="text-sm text-slate-500">Nu există teste în acest proiect</p>
      <a href="/projects/{projectId}/test-cases" class="mt-3 inline-block text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-800">Mergi la teste</a>
    </div>
  {:else}
    <div class="grid gap-4 lg:grid-cols-2">
      <!-- Available Tests Column -->
      <div class="rounded-md border border-slate-200 bg-white">
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Disponibile</h3>
          <span class="text-xs font-mono text-slate-300">{testeDisponibile.length}</span>
        </div>
        <!-- Search -->
        <div class="border-b border-slate-100 px-3 py-2">
          <div class="relative">
            <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input
              type="text"
              bind:value={searchAvailable}
              placeholder="Caută teste..."
              class="block w-full rounded border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
            />
          </div>
        </div>
        <!-- List -->
        <div class="max-h-[55vh] overflow-y-auto p-2">
          {#if testeDisponibile.length === 0}
            <div class="py-8 text-center">
              <p class="text-xs text-slate-300">{toateTestele.length > 0 ? 'Toate testele sunt selectate' : 'Niciun test disponibil'}</p>
            </div>
          {:else}
            {#each testeDisponibile as t (t.id)}
              {@const isAuto = t.tipTestare === 'automata'}
              {@const prioBadge = t.prioritate === 'critica' ? 'bg-rose-50 text-rose-600' : t.prioritate === 'inalta' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'}
              {@const prioLabel = t.prioritate === 'critica' ? 'CRIT' : t.prioritate === 'inalta' ? 'ÎNALT' : ''}
              <button
                type="button"
                on:click={() => toggleTest(t.id)}
                class="flex w-full items-center gap-2.5 rounded px-3 py-2 text-left hover:bg-amber-50 transition-colors cursor-pointer group"
              >
                <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-white group-hover:border-amber-400 transition-colors">
                </span>
                <span class="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-semibold text-slate-500">{t.cod || 'TC-?'}</span>
                <span class="shrink-0 rounded {isAuto ? 'bg-violet-50 text-violet-600' : 'bg-sky-50 text-sky-600'} px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider">{isAuto ? 'AUTO' : 'MAN'}</span>
                {#if prioLabel}
                  <span class="shrink-0 rounded {prioBadge} px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider">{prioLabel}</span>
                {/if}
                <span class="flex-1 truncate text-xs text-slate-700">{t.titlu}</span>
                <span class="shrink-0 text-xs font-mono text-slate-300 hidden sm:block">{t.mediu}</span>
              </button>
            {/each}
          {/if}
          {#if nextCursor}
            <div class="pt-2 text-center">
              <button on:click={incarcaMaiMulte} disabled={loadingMore} class="text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer disabled:opacity-50">
                {loadingMore ? 'Se încarcă...' : 'Încarcă mai multe teste'}
              </button>
            </div>
          {/if}
        </div>
      </div>

      <!-- Selected Tests Column -->
      <div class="rounded-md border border-slate-200 bg-white">
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Selectate</h3>
          <span class="text-xs font-mono {selectedTestIds.length > 0 ? 'text-amber-600' : 'text-slate-300'}">{selectedTestIds.length}</span>
        </div>
        <!-- Search -->
        <div class="border-b border-slate-100 px-3 py-2">
          <div class="relative">
            <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input
              type="text"
              bind:value={searchSelected}
              placeholder="Caută în selecție..."
              class="block w-full rounded border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
            />
          </div>
        </div>
        <!-- List -->
        <div class="max-h-[55vh] overflow-y-auto p-2">
          {#if selectedTestIds.length === 0}
            <div class="py-8 text-center">
              <p class="text-xs text-slate-300">Niciun test selectat</p>
              <p class="mt-1 text-xs text-slate-200">Click pe un test din stânga pentru a-l adăuga</p>
            </div>
          {:else if testeSelectate.length === 0}
            <div class="py-8 text-center">
              <p class="text-xs text-slate-300">Nicio potrivire în selecție</p>
            </div>
          {:else}
            {#each testeSelectate as t, i (t.id)}
              {@const realIdx = selectedTestIds.indexOf(t.id)}
              {@const isAuto = t.tipTestare === 'automata'}
              {@const prioBadge = t.prioritate === 'critica' ? 'bg-rose-50 text-rose-600' : t.prioritate === 'inalta' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-400'}
              {@const prioLabel = t.prioritate === 'critica' ? 'CRIT' : t.prioritate === 'inalta' ? 'ÎNALT' : ''}
              <div class="flex items-center gap-2.5 rounded bg-amber-50/60 px-3 py-2 group/row">
                <button
                  type="button"
                  on:click={() => toggleTest(t.id)}
                  class="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-amber-400 bg-amber-400 cursor-pointer hover:bg-amber-500 transition-colors"
                >
                  <svg class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                </button>
                <span class="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-mono font-semibold text-amber-700">{t.cod || 'TC-?'}</span>
                <span class="shrink-0 rounded {isAuto ? 'bg-violet-50 text-violet-600' : 'bg-sky-50 text-sky-600'} px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider">{isAuto ? 'AUTO' : 'MAN'}</span>
                {#if prioLabel}
                  <span class="shrink-0 rounded {prioBadge} px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider">{prioLabel}</span>
                {/if}
                <span class="flex-1 truncate text-xs text-slate-700">{t.titlu}</span>
                <span class="shrink-0 text-xs font-mono text-slate-300 hidden sm:block">{t.mediu}</span>
                <div class="shrink-0 flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                  <button type="button" on:click={() => mutaSus(realIdx)} disabled={realIdx === 0} class="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors" title="Mută sus">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                  </button>
                  <button type="button" on:click={() => mutaJos(realIdx)} disabled={realIdx >= selectedTestIds.length - 1} class="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-white disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors" title="Mută jos">
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
