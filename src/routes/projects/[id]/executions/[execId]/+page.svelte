<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { toast } from '$lib/stores/toast';

  let exec: any = null;
  let incarcare = true;
  let eroare = '';
  let lightboxUrl = '';
  let lightboxList: string[] = [];

  const projectId = $page.params.id;
  const execId = $page.params.execId;

  onMount(async () => {
    try {
      const r = await fetch(`/api/projects/${projectId}/executions/${execId}`);
      const data = await r.json();
      if (data.error) { eroare = data.error; return; }
      exec = data;
    } catch { eroare = 'Eroare la încărcare'; }
    incarcare = false;
  });

  async function schimbaStatus(rezultatId: string, newStatus: string) {
    const r = await fetch(`/api/projects/${projectId}/executions/${execId}/results`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rezultatId, status: newStatus })
    });
    const data = await r.json();
    if (data.error) { toast.error(data.error); return; }

    if (exec) {
      const idx = exec.rezultate.findIndex((r: any) => r.id === rezultatId);
      if (idx !== -1) exec.rezultate[idx].status = newStatus;
      exec = exec;
    }

    toast.success('Status actualizat');

    if (newStatus === 'esuat') {
      const rez = exec?.rezultate?.find((r: any) => r.id === rezultatId);
      if (rez) {
        await fetch(`/api/projects/${projectId}/bugs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titlu: `[Eșuat] ${rez.titlu}`,
            descriere: `Pași: ${rez.pasi || '-'}\nAșteptat: ${rez.rezultatAsteptat || '-'}\nObținut: ${rez.rezultatObtinut || '-'}`,
            testId: rez.testId,
            executionResultId: rezultatId,
            severitate: 'majora'
          })
        });
      }
    }
  }

  function deschideLightbox(url: string, cai: string[]) {
    lightboxList = cai;
    lightboxUrl = url;
  }

  function inchideLightbox() {
    lightboxUrl = '';
    lightboxList = [];
  }

  function lightboxPrev() {
    const idx = lightboxList.indexOf(lightboxUrl);
    if (idx > 0) lightboxUrl = lightboxList[idx - 1];
  }

  function lightboxNext() {
    const idx = lightboxList.indexOf(lightboxUrl);
    if (idx < lightboxList.length - 1) lightboxUrl = lightboxList[idx + 1];
  }

  function statusCuloare(status: string): string {
    if (status === 'trecut') return 'border-l-emerald-400';
    if (status === 'esuat') return 'border-l-rose-400';
    if (status === 'blocat') return 'border-l-amber-400';
    return 'border-l-slate-300';
  }

  function statusSelectStyle(status: string): string {
    if (status === 'trecut') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (status === 'esuat') return 'border-rose-200 bg-rose-50 text-rose-700';
    if (status === 'blocat') return 'border-amber-200 bg-amber-50 text-amber-700';
    return 'border-slate-200 bg-white text-slate-600';
  }

  $: stats = exec ? (() => {
    const total = exec.rezultate?.length || 0;
    const trecute = exec.rezultate?.filter((r: any) => r.status === 'trecut').length || 0;
    const esuate = exec.rezultate?.filter((r: any) => r.status === 'esuat').length || 0;
    const blocate = exec.rezultate?.filter((r: any) => r.status === 'blocat').length || 0;
    const netestate = exec.rezultate?.filter((r: any) => r.status === 'netestat').length || 0;
    const progres = total > 0 ? Math.round(((total - netestate) / total) * 100) : 0;
    return { total, trecute, esuate, blocate, netestate, progres };
  })() : null;
</script>

<div class="space-y-5">
  <!-- Header -->
  <div>
    <a href="/projects/{projectId}/executions" class="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors">
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      Înapoi la execuții
    </a>
    {#if exec}
      <div class="mt-2 flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">{exec.nume}</h1>
          {#if exec.suite}
            <p class="mt-1 text-xs text-slate-400 font-mono">{exec.suite.nume}</p>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  {#if eroare}
    <div class="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{eroare}</div>
  {:else if incarcare}
    <div class="py-16 text-center">
      <div class="inline-flex items-center gap-2 text-sm text-slate-400">
        <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        Se încarcă...
      </div>
    </div>
  {:else if exec && stats}
    <!-- Stats -->
    <div class="grid gap-3 grid-cols-2 sm:grid-cols-5">
      <div class="rounded-md border border-slate-200 bg-white px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Progres</p>
        <p class="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">{stats.progres}%</p>
      </div>
      <div class="rounded-md border border-slate-200 bg-white px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Total</p>
        <p class="mt-1 text-xl font-bold font-mono tabular-nums text-slate-900">{stats.total}</p>
      </div>
      <div class="rounded-md border border-slate-200 bg-white px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Trecute</p>
        <p class="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-600">{stats.trecute}</p>
      </div>
      <div class="rounded-md border border-slate-200 bg-white px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Eșuate</p>
        <p class="mt-1 text-xl font-bold font-mono tabular-nums text-rose-600">{stats.esuate}</p>
      </div>
      <div class="rounded-md border border-slate-200 bg-white px-4 py-3">
        <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Blocate</p>
        <p class="mt-1 text-xl font-bold font-mono tabular-nums text-amber-600">{stats.blocate}</p>
      </div>
    </div>

    <!-- Progress Bar -->
    <div class="h-2 rounded-full bg-slate-100 overflow-hidden flex">
      {#if stats.trecute > 0}
        <div class="h-full bg-emerald-500 transition-all" style="width: {stats.total > 0 ? (stats.trecute / stats.total * 100) : 0}%"></div>
      {/if}
      {#if stats.esuate > 0}
        <div class="h-full bg-rose-500 transition-all" style="width: {stats.total > 0 ? (stats.esuate / stats.total * 100) : 0}%"></div>
      {/if}
      {#if stats.blocate > 0}
        <div class="h-full bg-amber-500 transition-all" style="width: {stats.total > 0 ? (stats.blocate / stats.total * 100) : 0}%"></div>
      {/if}
    </div>

    <!-- Results -->
    <div class="space-y-1.5">
      {#each exec.rezultate || [] as r (r.id)}
        <div class="rounded-md border border-slate-200 bg-white {statusCuloare(r.status)} border-l-[3px]">
          <div class="flex items-start gap-4 px-4 py-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 mb-1">
                {#if r.cod}
                  <span class="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-semibold text-slate-500">{r.cod}</span>
                {/if}
                <span class="text-sm font-medium text-slate-800">{r.titlu}</span>
              </div>
              {#if r.mediu}
                <span class="text-xs font-mono text-slate-400">{r.mediu}</span>
              {/if}

              {#if r.pasi}
                <div class="mt-2 rounded-md bg-slate-50 border border-slate-100 px-3 py-2">
                  <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Pași</p>
                  <pre class="whitespace-pre-wrap text-xs text-slate-600 font-sans leading-relaxed">{r.pasi}</pre>
                </div>
              {/if}

              <div class="mt-2 grid gap-2 sm:grid-cols-2">
                {#if r.rezultatAsteptat}
                  <div class="rounded-md bg-emerald-50/50 border border-emerald-100 px-3 py-2">
                    <p class="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-0.5">Așteptat</p>
                    <p class="text-xs text-emerald-800 leading-relaxed">{r.rezultatAsteptat}</p>
                  </div>
                {/if}
                {#if r.rezultatObtinut}
                  <div class="rounded-md bg-slate-50 border border-slate-100 px-3 py-2">
                    <p class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Obținut</p>
                    <p class="text-xs text-slate-700 leading-relaxed">{r.rezultatObtinut}</p>
                  </div>
                {/if}
              </div>

              {#if r.dovezi}
                <button on:click={() => deschideLightbox(r.dovezi, [r.dovezi])} class="mt-2 text-xs font-medium text-slate-500 hover:text-slate-700 underline underline-offset-2 cursor-pointer">Vezi dovezi</button>
              {/if}
            </div>

            <!-- Status selector -->
            <select
              value={r.status}
              on:change={(e) => schimbaStatus(r.id, e.currentTarget.value)}
              class="shrink-0 rounded-md border px-3 py-2 text-xs font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 min-w-[120px] {statusSelectStyle(r.status)}"
            >
              <option value="netestat">Netestat</option>
              <option value="trecut">Trecut</option>
              <option value="esuat">Eșuat</option>
              <option value="blocat">Blocat</option>
            </select>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Lightbox -->
{#if lightboxUrl}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" role="dialog" aria-modal="true" on:click={inchideLightbox}>
    <div class="relative flex max-h-full max-w-full items-center justify-center p-4" role="presentation" on:click|stopPropagation>
      {#if lightboxList.length > 1}
        <button on:click={lightboxPrev} class="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors text-xl cursor-pointer">&larr;</button>
      {/if}
      <img src={lightboxUrl} alt="Imagine" class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl" />
      {#if lightboxList.length > 1}
        <button on:click={lightboxNext} class="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors text-xl cursor-pointer">&rarr;</button>
      {/if}
      <button on:click={inchideLightbox} class="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors cursor-pointer">✕</button>
    </div>
  </div>
{/if}
