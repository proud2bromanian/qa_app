<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import { slide, fade } from 'svelte/transition';
  import { page } from '$app/stores';
  import { toast } from '$lib/stores/toast';

  let teste: any[] = [];
  let incarcare = true;
  let eroare = '';
  let nextCursor: string | null = null;
  let totalTeste = 0;
  let totalFiltrat = 0;
  let totalManual = 0;
  let totalAutomat = 0;
  let loadingMore = false;
  let searchTerm = '';
  let filtruMediu = '';
  let filtruTipTestare = '';
  let filtruPrioritate = '';
  let sortBy: 'cod' | 'titlu' | 'mediu' = 'cod';
  let expandedCards: string[] = [];
  let showCsvInfo = false;
  let selectMode = false;
  let selectedIds: string[] = [];
  let deletingBatch = false;

  let showAddTest = false;
  let testEditatId: string | null = null;
  let testTitlu = '';
  let testMediu = '';
  let testPasiList: string[] = [''];
  let testRezultatAsteptat = '';
  let testTipTestare = 'manuala';
  let testPrioritate = 'medie';
  let testRezultatObtinut = '';
  let testFisiereNoi: File[] = [];
  let testAtasamentePastrate: { id: string; cale: string }[] = [];
  let testCloneAtasamenteIds: string[] = [];
  let previewUrls: string[] = [];
  let focusPasIndex: number | null = null;
  const PAGE_SIZE = 50;
  let mounted = false;
  let queryKey = '';
  let currentQueryKey = '';
  let reloadTimer: ReturnType<typeof setTimeout> | null = null;
  let loadRequestId = 0;
  let sentinelEl: HTMLDivElement | null = null;
  let observedSentinel: HTMLDivElement | null = null;
  let loadMoreObserver: IntersectionObserver | null = null;

  afterUpdate(() => {
    if (focusPasIndex !== null) {
      const inputs = document.querySelectorAll('.pas-input');
      const el = inputs[focusPasIndex] as HTMLInputElement | undefined;
      if (el) el.focus();
      focusPasIndex = null;
    }
    observeSentinel();
    maybeLoadMoreFromScroll();
  });

  let lightboxUrl = '';
  let lightboxList: string[] = [];

  const projectId = $page.params.id;

  function buildTestCaseParams(options: { cursor?: string | null; selectIds?: boolean } = {}) {
    const params = new URLSearchParams({
      take: String(PAGE_SIZE),
      sort: sortBy
    });

    if (options.cursor) params.set('cursor', options.cursor);
    if (options.selectIds) params.set('selectIds', '1');
    if (searchTerm.trim()) params.set('search', searchTerm.trim());
    if (filtruMediu.trim()) params.set('mediu', filtruMediu.trim());
    if (filtruTipTestare) params.set('tipTestare', filtruTipTestare);
    if (filtruPrioritate) params.set('prioritate', filtruPrioritate);

    return params;
  }

  async function incarcaTeste(options: { append?: boolean } = {}) {
    const append = options.append === true;
    const requestId = ++loadRequestId;
    if (append) loadingMore = true;
    else {
      incarcare = true;
      nextCursor = null;
      selectedIds = [];
    }

    try {
      const params = buildTestCaseParams({ cursor: append ? nextCursor : null });
      const r = await fetch(`/api/projects/${projectId}/test-cases?${params.toString()}`);
      if (!r.ok) throw new Error('Eroare la încărcare');

      const result = await r.json();
      if (requestId !== loadRequestId) return;

      const data = result.data || [];
      if (append) {
        const idsExistente = new Set(teste.map(t => t.id));
        teste = [...teste, ...data.filter((test: any) => !idsExistente.has(test.id))];
      } else {
        teste = data;
      }
      nextCursor = result.nextCursor || null;
      totalFiltrat = result.total || 0;
      totalTeste = result.totalAll ?? result.total ?? 0;
      totalManual = result.totalManual || 0;
      totalAutomat = result.totalAutomat || 0;
      eroare = '';
    } catch {
      if (requestId === loadRequestId) eroare = 'Eroare la încărcare';
    } finally {
      if (requestId === loadRequestId) {
        incarcare = false;
        loadingMore = false;
      }
    }
  }

  function numarPasii(pasi: string): number {
    if (!pasi) return 0;
    return pasi.split('\n').filter((p: string) => p.trim()).length;
  }

  $: testeFiltrate = teste;
  $: filtreActive = !!(searchTerm.trim() || filtruMediu.trim() || filtruTipTestare || filtruPrioritate);
  $: queryKey = `${searchTerm}|${filtruMediu}|${filtruTipTestare}|${filtruPrioritate}|${sortBy}`;
  $: if (mounted && queryKey !== currentQueryKey) {
    currentQueryKey = queryKey;
    scheduleReload();
  }

  onMount(() => {
    mounted = true;
    currentQueryKey = queryKey;
    loadMoreObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some(entry => entry.isIntersecting)) {
          incarcaUrmatoarele();
        }
      },
      { rootMargin: '600px 0px' }
    );
    incarcaTeste();
    return () => {
      if (reloadTimer) clearTimeout(reloadTimer);
      if (loadMoreObserver) loadMoreObserver.disconnect();
    };
  });

  function scheduleReload() {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      incarcaTeste();
    }, 250);
  }

  function observeSentinel() {
    if (!loadMoreObserver || sentinelEl === observedSentinel) return;
    if (observedSentinel) loadMoreObserver.unobserve(observedSentinel);
    observedSentinel = sentinelEl;
    if (observedSentinel) loadMoreObserver.observe(observedSentinel);
  }

  function maybeLoadMoreFromScroll() {
    if (!sentinelEl || !nextCursor || loadingMore || incarcare) return;
    const rect = sentinelEl.getBoundingClientRect();
    if (rect.top <= window.innerHeight + 600) incarcaUrmatoarele();
  }

  function incarcaUrmatoarele() {
    if (!nextCursor || loadingMore || incarcare) return;
    incarcaTeste({ append: true });
  }

  function toggleExpand(id: string) {
    if (expandedCards.includes(id)) {
      expandedCards = expandedCards.filter(x => x !== id);
    } else {
      expandedCards = [...expandedCards, id];
    }
  }

  function extrageCai(t: any): string[] {
    return t.atasamente?.map((a: any) => a.cale) || [];
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

  function adaugaFisiere(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (!input.files?.length) return;
    for (const f of input.files) {
      testFisiereNoi = [...testFisiereNoi, f];
      previewUrls = [...previewUrls, URL.createObjectURL(f)];
    }
    input.value = '';
  }

  function eliminaFisierNou(idx: number) {
    URL.revokeObjectURL(previewUrls[idx]);
    testFisiereNoi = testFisiereNoi.filter((_, i) => i !== idx);
    previewUrls = previewUrls.filter((_, i) => i !== idx);
  }

  function eliminaAtasamentExistent(id: string) {
    testAtasamentePastrate = testAtasamentePastrate.filter(a => a.id !== id);
  }

  function adaugaPas() {
    testPasiList = [...testPasiList, ''];
    focusPasIndex = testPasiList.length - 1;
  }

  function stergePas(idx: number) {
    if (testPasiList.length <= 1) {
      testPasiList = [''];
      return;
    }
    testPasiList = testPasiList.filter((_, i) => i !== idx);
  }

  function mutaPasSus(idx: number) {
    if (idx === 0) return;
    const arr = [...testPasiList];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    testPasiList = arr;
  }

  function mutaPasJos(idx: number) {
    if (idx >= testPasiList.length - 1) return;
    const arr = [...testPasiList];
    [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
    testPasiList = arr;
  }

  function handlePasKeydown(e: KeyboardEvent, idx: number) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (idx === testPasiList.length - 1) {
        testPasiList = [...testPasiList, ''];
        focusPasIndex = testPasiList.length - 1;
      } else {
        const inputs = document.querySelectorAll('.pas-input');
        const next = inputs[idx + 1] as HTMLInputElement | undefined;
        if (next) next.focus();
      }
    }
  }

  async function adaugaTest() {
    if (!testTitlu.trim() || !testMediu.trim() || !testRezultatAsteptat.trim()) {
      toast.error('Completați toate câmpurile obligatorii');
      return;
    }
    if (testPasiList.every(p => !p.trim())) {
      toast.error('Adăugați cel puțin un pas de reproducere');
      return;
    }
    const formData = new FormData();
    formData.append('titlu', testTitlu);
    formData.append('mediu', testMediu);
    formData.append('pasi', testPasiList.join('\n'));
    formData.append('rezultatAsteptat', testRezultatAsteptat);
    formData.append('rezultatObtinut', testRezultatObtinut);
    formData.append('tipTestare', testTipTestare);
    formData.append('prioritate', testPrioritate);
    formData.append('pastreazaAtasamente', JSON.stringify(testAtasamentePastrate.map(a => a.id)));
    if (testCloneAtasamenteIds.length > 0) {
      formData.append('cloneAtasamente', JSON.stringify(testCloneAtasamenteIds));
    }
    for (const f of testFisiereNoi) {
      formData.append('screenshot', f);
    }

    if (testEditatId) {
      const response = await fetch(`/api/projects/${projectId}/test-cases/${testEditatId}`, {
        method: 'PATCH',
        body: formData
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error || 'Testul nu a putut fi actualizat');
        return;
      }
    } else {
      const response = await fetch(`/api/projects/${projectId}/test-cases`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        toast.error(result.error || 'Testul nu a putut fi creat');
        return;
      }
    }
    reseteazaFormular();
    showAddTest = false;
    await incarcaTeste();
  }

  function reseteazaFormular() {
    testTitlu = ''; testMediu = ''; testPasiList = ['']; testRezultatAsteptat = ''; testTipTestare = 'manuala'; testPrioritate = 'medie';
    testRezultatObtinut = ''; testFisiereNoi = []; testAtasamentePastrate = []; testCloneAtasamenteIds = []; previewUrls = []; testEditatId = null;
  }

  function editeazaTest(t: any) {
    testEditatId = t.id;
    testTitlu = t.titlu;
    testMediu = t.mediu;
    testPasiList = t.pasi ? t.pasi.split('\n') : [''];
    testRezultatAsteptat = t.rezultatAsteptat;
    testTipTestare = t.tipTestare || 'manuala';
    testPrioritate = t.prioritate || 'medie';
    testRezultatObtinut = t.rezultatObtinut || '';
    testAtasamentePastrate = (t.atasamente || []).map((a: any) => ({ id: a.id, cale: a.cale }));
    testFisiereNoi = [];
    previewUrls = [];
    showAddTest = true;
  }

  async function stergeTest(id: string) {
    if (!confirm('Sigur doriți să ștergeți acest test?')) return;
    await fetch(`/api/projects/${projectId}/test-cases/${id}`, { method: 'DELETE' });
    await incarcaTeste();
  }

  function cloneazaTest(t: any) {
    testEditatId = null;
    testTitlu = (t.titlu || '') + ' (Copie)';
    testMediu = t.mediu || '';
    testPasiList = t.pasi ? t.pasi.split('\n') : [''];
    testRezultatAsteptat = t.rezultatAsteptat || '';
    testTipTestare = t.tipTestare || 'manuala';
    testPrioritate = t.prioritate || 'medie';
    testRezultatObtinut = t.rezultatObtinut || '';
    testCloneAtasamenteIds = (t.atasamente || []).map((a: any) => a.id);
    testFisiereNoi = [];
    previewUrls = [];
    testAtasamentePastrate = [];
    showAddTest = true;
  }

  async function exportCSV() {
    window.open(`/api/projects/${projectId}/export-csv`, '_blank');
  }

  async function importCSV(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    if (!input.files?.length) return;
    const formData = new FormData();
    formData.append('file', input.files[0]);
    const r = await fetch(`/api/projects/${projectId}/import-csv`, { method: 'POST', body: formData });
    const data = await r.json();
    if (!r.ok) {
      toast.error(data.error || 'Importul CSV a eșuat');
      input.value = '';
      return;
    }
    if (data.errors) {
      toast.success(`Import: ${data.imported} teste adăugate, ${data.errors.length} erori`);
    } else {
      toast.success(`Import reușit! ${data.imported} teste adăugate.`);
    }
    input.value = '';
    await incarcaTeste();
  }

  function handleSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      searchTerm = '';
      (e.target as HTMLInputElement).blur();
    }
  }

  function toggleSelectMode() {
    selectMode = !selectMode;
    selectedIds = [];
  }

  function toggleSelect(id: string) {
    if (selectedIds.includes(id)) {
      selectedIds = selectedIds.filter(x => x !== id);
    } else {
      selectedIds = [...selectedIds, id];
    }
  }

  async function selectAll() {
    if (selectedIds.length === testeFiltrate.length && totalFiltrat > testeFiltrate.length) {
      try {
        const params = buildTestCaseParams({ selectIds: true });
        const r = await fetch(`/api/projects/${projectId}/test-cases?${params.toString()}`);
        const data = await r.json();
        selectedIds = data.ids || [];
        toast.info(`${selectedIds.length} teste selectate`);
      } catch { toast.error('Eroare la selectare'); }
    } else {
      selectedIds = testeFiltrate.map(t => t.id);
    }
  }

  function deselectAll() {
    selectedIds = [];
  }

  async function stergeSelectate() {
    if (!confirm(`Sigur doriți să ștergeți ${selectedIds.length} teste? Acțiunea este ireversibilă.`)) return;
    deletingBatch = true;
    try {
      const r = await fetch(`/api/projects/${projectId}/test-cases/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        toast.error(data.error || 'Ștergerea a eșuat');
        return;
      }
      toast.success(`${selectedIds.length} teste șterse`);
      selectedIds = [];
      selectMode = false;
      await incarcaTeste();
    } catch { toast.error('Eroare la ștergere'); }
    deletingBatch = false;
  }
</script>

<svelte:window on:keydown={(e) => {
  if (e.key === '/' && !showAddTest && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'SELECT') {
    e.preventDefault();
    document.getElementById('search-input')?.focus();
  }
  if (e.key === 'Escape') showCsvInfo = false;
}} on:click={() => { if (showCsvInfo) showCsvInfo = false; }} />

<div class="space-y-5">
  <!-- Header -->
  <div class="flex items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Cazuri de Test</h1>
      <div class="mt-1.5 flex items-center gap-3 text-xs font-mono text-slate-400 tracking-wide">
        <span>{totalTeste || teste.length} total</span>
        <span class="text-slate-200">|</span>
        <span class="text-sky-600">{totalManual} manuale</span>
        <span class="text-slate-200">|</span>
        <span class="text-violet-600">{totalAutomat} automate</span>
        {#if filtreActive}
          <span class="text-slate-200">|</span>
          <span class="text-amber-600">{totalFiltrat} rezultate</span>
        {/if}
      </div>
    </div>
    <div class="flex gap-2 shrink-0">
      <button on:click={exportCSV} class="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
        Export
      </button>
      <div class="relative">
        <label for="import-csv-input" class="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
          Import
        </label>
        <input id="import-csv-input" type="file" accept=".csv" on:change={importCSV} class="hidden" />
        <button type="button" on:click|stopPropagation={() => showCsvInfo = !showCsvInfo} class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-700 transition-colors cursor-pointer text-[10px] font-bold" title="Format CSV">?</button>
        {#if showCsvInfo}
          <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
          <div class="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-xl" on:click|stopPropagation>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-slate-700">Format CSV necesar</span>
              <button on:click={() => showCsvInfo = false} class="text-slate-400 hover:text-slate-600 cursor-pointer">
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="rounded bg-slate-50 border border-slate-100 px-3 py-2.5 mb-3">
              <code class="text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap break-all">Titlu,Mediu,Pasi,Rezultat Asteptat,Rezultat Obtinut,Tip Testare,Prioritate</code>
            </div>
            <div class="space-y-1.5 text-[11px] text-slate-500">
              <div class="flex gap-2">
                <span class="shrink-0 font-semibold text-slate-600 w-28">Titlu</span>
                <span>obligatoriu — numele testului</span>
              </div>
              <div class="flex gap-2">
                <span class="shrink-0 font-semibold text-slate-600 w-28">Mediu</span>
                <span>obligatoriu — ex: Chrome 120</span>
              </div>
              <div class="flex gap-2">
                <span class="shrink-0 font-semibold text-slate-600 w-28">Pasi</span>
                <span>obligatoriu — separati cu linie noua</span>
              </div>
              <div class="flex gap-2">
                <span class="shrink-0 font-semibold text-slate-600 w-28">Rez. Asteptat</span>
                <span>obligatoriu</span>
              </div>
              <div class="flex gap-2">
                <span class="shrink-0 font-semibold text-slate-600 w-28">Rez. Obtinut</span>
                <span>optional</span>
              </div>
              <div class="flex gap-2">
                <span class="shrink-0 font-semibold text-slate-600 w-28">Tip Testare</span>
                <span>manuala / automata</span>
              </div>
              <div class="flex gap-2">
                <span class="shrink-0 font-semibold text-slate-600 w-28">Prioritate</span>
                <span>critica / inalta / medie / scazuta</span>
              </div>
            </div>
          </div>
        {/if}
      </div>
      <button on:click={() => { reseteazaFormular(); showAddTest = true; }} class="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all cursor-pointer">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Test Nou
      </button>
      <button on:click={toggleSelectMode} class="inline-flex items-center gap-1.5 rounded-md border {selectMode ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'} px-3.5 py-2 text-xs font-medium transition-all cursor-pointer">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
        {selectMode ? 'Anulează' : 'Selectează'}
      </button>
    </div>
  </div>

  <!-- Search & Filters -->
  <div class="flex items-center gap-3">
    <div class="relative flex-1 max-w-md">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input
        id="search-input"
        type="text"
        bind:value={searchTerm}
        on:keydown={handleSearchKeydown}
        placeholder="Caută după titlu, cod, pași, mediu..."
        class="block w-full rounded-md border border-slate-200 bg-white pl-9 pr-16 py-2 text-sm font-mono placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
      />
      <kbd class="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-mono text-slate-400 pointer-events-none">/</kbd>
    </div>
    <div class="h-8 w-px bg-slate-200"></div>
    <select bind:value={filtruTipTestare} class="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer">
      <option value="">Toate tipurile</option>
      <option value="manuala">Manuale</option>
      <option value="automata">Automate</option>
    </select>
    <select bind:value={filtruPrioritate} class="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer">
      <option value="">Toate prioritățile</option>
      <option value="critica">Critică</option>
      <option value="inalta">Înaltă</option>
      <option value="medie">Medie</option>
      <option value="scăzuta">Scăzută</option>
    </select>
    <input
      type="text"
      bind:value={filtruMediu}
      placeholder="Filtru mediu..."
      class="w-36 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
    />
    <div class="h-8 w-px bg-slate-200"></div>
    <select bind:value={sortBy} class="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer">
      <option value="cod">Sortare: Cod</option>
      <option value="titlu">Sortare: Titlu</option>
      <option value="mediu">Sortare: Mediu</option>
    </select>
  </div>

  <!-- Test Cards -->
  {#if incarcare}
    <div class="py-16 text-center">
      <div class="inline-flex items-center gap-2 text-sm text-slate-400">
        <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
        Se încarcă...
      </div>
    </div>
  {:else if eroare}
    <div class="rounded-lg border border-red-100 bg-red-50/70 py-12 text-center">
      <p class="text-sm font-medium text-red-700">{eroare}</p>
      <button on:click={() => incarcaTeste()} class="mt-3 text-xs font-semibold text-red-700 underline underline-offset-2 decoration-red-300 hover:decoration-red-600 cursor-pointer">
        Reîncearcă
      </button>
    </div>
  {:else if totalTeste === 0}
    <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-20 text-center">
      <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
        <svg class="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      </div>
      <p class="text-sm font-medium text-slate-600">Niciun test în acest proiect</p>
      <p class="mt-1 text-xs text-slate-400">Creați primul test sau importați din CSV</p>
      <button on:click={() => { reseteazaFormular(); showAddTest = true; }} class="mt-5 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-all cursor-pointer">
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        Test Nou
      </button>
    </div>
  {:else if testeFiltrate.length === 0}
    <div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
      <p class="text-sm text-slate-500">Niciun test nu corespunde filtrelor</p>
      <button on:click={() => { searchTerm = ''; filtruMediu = ''; filtruTipTestare = ''; filtruPrioritate = ''; }} class="mt-3 text-xs font-medium text-slate-600 underline underline-offset-2 decoration-slate-300 hover:decoration-slate-500 cursor-pointer">
        Resetează filtrele
      </button>
    </div>
  {:else}
    <div class="space-y-1.5">
      {#each testeFiltrate as t (t.id)}
        {@const expanded = expandedCards.includes(t.id)}
        {@const pasiArr = t.pasi ? t.pasi.split('\n').filter(p => p.trim()) : []}
        {@const isAuto = t.tipTestare === 'automata'}
        {@const borderColor = isAuto ? 'border-l-violet-400' : 'border-l-sky-400'}
        {@const badgeBg = isAuto ? 'bg-violet-50 text-violet-700' : 'bg-sky-50 text-sky-700'}
        {@const badgeIcon = isAuto
          ? 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4'
          : 'M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122'}
        {@const prioritate = t.prioritate || 'medie'}
        {@const prioBadge = prioritate === 'critica' ? { bg: 'bg-rose-50 text-rose-600', label: 'CRIT' } : prioritate === 'inalta' ? { bg: 'bg-orange-50 text-orange-600', label: 'ÎNALT' } : prioritate === 'scăzuta' ? { bg: 'bg-slate-50 text-slate-400', label: 'SCĂZ' } : { bg: 'bg-slate-50 text-slate-500', label: 'MED' }}
        <div class="group rounded-md border {selectedIds.includes(t.id) ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white'} {borderColor} border-l-[3px] hover:border-slate-300 transition-colors">
          <!-- Card Header -->
          <div class="flex items-center">
            {#if selectMode}
              <button type="button" on:click|stopPropagation={() => toggleSelect(t.id)} class="flex items-center pl-3 pr-1 cursor-pointer shrink-0" tabindex="-1">
                <div class="flex h-4 w-4 items-center justify-center rounded border {selectedIds.includes(t.id) ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-white hover:border-slate-400'} transition-colors">
                  {#if selectedIds.includes(t.id)}
                    <svg class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                  {/if}
                </div>
              </button>
            {/if}
          <button
            type="button"
            on:click={() => toggleExpand(t.id)}
            class="flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer"
          >
            <!-- TC Code -->
            <span class="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-semibold text-slate-600 tabular-nums tracking-tight">
              {t.cod || 'TC-?'}
            </span>

            <!-- Type Badge -->
            <span class="shrink-0 inline-flex items-center gap-1 rounded {badgeBg} px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider">
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d={badgeIcon}/></svg>
              {isAuto ? 'AUTO' : 'MAN'}
            </span>

            <!-- Priority Badge -->
            <span class="shrink-0 inline-flex items-center gap-1 rounded {prioBadge.bg} px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider">
              {prioBadge.label}
            </span>

            <!-- Title -->
            <span class="flex-1 truncate text-sm font-medium text-slate-800 group-hover:text-slate-900">
              {t.titlu}
            </span>

            <!-- Metadata pills -->
            <div class="hidden sm:flex items-center gap-2 shrink-0">
              {#if t.mediu}
                <span class="inline-flex items-center gap-1 text-xs text-slate-400 font-mono">
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  {t.mediu}
                </span>
              {/if}
              <span class="text-xs text-slate-300 font-mono">{pasiArr.length} pași</span>
              {#if t.atasamente?.length}
                <span class="inline-flex items-center gap-0.5 text-xs text-slate-400 font-mono">
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                  {t.atasamente.length}
                </span>
              {/if}
            </div>

            <!-- Expand Chevron -->
            <svg class="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 {expanded ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
          </div>

          <!-- Expanded Details -->
          {#if expanded}
            <div transition:slide={{ duration: 150 }}>
              <div class="border-t border-slate-100 px-4 py-4">
                <!-- Steps -->
                {#if pasiArr.length > 0}
                  <div class="mb-4">
                    <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Pași de reproducere</h4>
                    <div class="space-y-1.5">
                      {#each pasiArr as pas, i}
                                                        <div class="flex items-start gap-2.5">
                          <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-mono font-semibold text-slate-500">{i + 1}</span>
                          <span class="text-sm text-slate-700 leading-relaxed">{pas}</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}

                <!-- Results -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div class="rounded-md bg-emerald-50/50 border border-emerald-100 px-3 py-2.5">
                    <h4 class="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-600">Rezultat așteptat</h4>
                    <p class="text-xs text-emerald-800 leading-relaxed whitespace-pre-wrap">{t.rezultatAsteptat || '—'}</p>
                  </div>
                  <div class="rounded-md bg-slate-50 border border-slate-100 px-3 py-2.5">
                    <h4 class="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Rezultat obținut</h4>
                    <p class="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{t.rezultatObtinut || '—'}</p>
                  </div>
                </div>

                <!-- Attachments -->
                {#if t.atasamente?.length}
                  <div class="mb-4">
                    <h4 class="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Atașamente</h4>
                    <div class="flex flex-wrap gap-2">
                      {#each t.atasamente as a}
                        <button type="button" on:click={() => deschideLightbox(a.cale, extrageCai(t))} class="h-14 w-20 rounded border border-slate-200 overflow-hidden p-0 cursor-pointer hover:opacity-80 transition-opacity">
                          <img src={a.cale} alt="Screenshot" class="h-full w-full object-cover" />
                        </button>
                      {/each}
                    </div>
                  </div>
                {/if}

                <!-- Actions -->
                <div class="flex items-center gap-1 pt-2 border-t border-slate-100">
                  <button on:click|stopPropagation={() => editeazaTest(t)} class="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    Editează
                  </button>
                  <button on:click|stopPropagation={() => cloneazaTest(t)} class="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                    Clonează
                  </button>
                  <button on:click|stopPropagation={() => stergeTest(t.id)} class="inline-flex items-center gap-1 rounded px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    Șterge
                  </button>
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Bulk Action Bar -->
    {#if selectMode && selectedIds.length > 0}
      <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
        <div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-2xl shadow-slate-900/10">
          <span class="text-sm font-semibold text-slate-900">{selectedIds.length} selectate</span>
          <div class="h-5 w-px bg-slate-200"></div>
          <button on:click={selectAll} class="text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer transition-colors">{selectedIds.length === testeFiltrate.length && totalFiltrat > testeFiltrate.length ? 'Toate rezultatele' : 'Toate vizibile'}</button>
          <button on:click={deselectAll} class="text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer transition-colors">Deselectează</button>
          <div class="h-5 w-px bg-slate-200"></div>
          <button on:click={stergeSelectate} disabled={deletingBatch} class="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            {deletingBatch ? 'Se șterge...' : 'Șterge'}
          </button>
        </div>
      </div>
    {/if}

    <!-- Results count footer -->
    <div class="pt-2 text-center">
      {#if nextCursor}
        <div class="pb-3 text-center">
          <div bind:this={sentinelEl} class="flex min-h-8 items-center justify-center">
            {#if loadingMore}
              <div class="inline-flex items-center gap-2 text-xs text-slate-400">
                <svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Se încarcă...
              </div>
            {/if}
          </div>
        </div>
      {/if}
      <span class="text-xs font-mono text-slate-300">
        {teste.length} din {totalFiltrat} teste
      </span>
    </div>
  {/if}
</div>

<!-- Modal Adăugare Test -->
{#if showAddTest}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" tabindex="-1" on:click={() => showAddTest = false} on:keydown={(e) => { if (e.key === 'Escape') showAddTest = false; }}>
    <div class="w-full max-w-2xl rounded-lg bg-white shadow-2xl" on:click|stopPropagation>
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h3 class="text-sm font-semibold text-slate-900">{testEditatId ? 'Editează Test' : 'Test Nou'}</h3>
        <button on:click={() => { reseteazaFormular(); showAddTest = false; }} class="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="space-y-4 max-h-[70vh] overflow-y-auto px-6 py-5">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="testTitlu">Titlu *</label>
          <input id="testTitlu" type="text" bind:value={testTitlu} class="block w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors" placeholder="Ex: Butonul Login nu funcționează cu date corecte" />
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="testMediu">Mediu *</label>
            <input id="testMediu" type="text" bind:value={testMediu} class="block w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors" placeholder="Chrome 120, Win 11..." />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="testTipTestare">Tip testare *</label>
            <select id="testTipTestare" bind:value={testTipTestare} class="block w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer">
              <option value="manuala">Manuală</option>
              <option value="automata">Automată</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="testPrioritate">Prioritate *</label>
            <select id="testPrioritate" bind:value={testPrioritate} class="block w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer">
              <option value="critica">Critică</option>
              <option value="inalta">Înaltă</option>
              <option value="medie">Medie</option>
              <option value="scăzuta">Scăzută</option>
            </select>
          </div>
        </div>

        <div>
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Pași de reproducere *</label>
          <div class="space-y-1.5">
            {#each testPasiList as pas, i}
              <div class="flex items-center gap-2">
                <span class="text-xs font-mono text-slate-400 w-5 text-right shrink-0">{i + 1}.</span>
                <input type="text" bind:value={testPasiList[i]} on:keydown={(e) => handlePasKeydown(e, i)}
                  class="pas-input block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
                  placeholder="Descrieți pasul {i + 1}" />
                <button type="button" on:click={() => mutaPasSus(i)} disabled={i === 0} class="shrink-0 flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer" title="Mută sus">
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
                </button>
                <button type="button" on:click={() => mutaPasJos(i)} disabled={i >= testPasiList.length - 1} class="shrink-0 flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer" title="Mută jos">
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <button type="button" on:click={() => stergePas(i)} class="shrink-0 flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer" title="Șterge pas">
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            {/each}
          </div>
          <button type="button" on:click={adaugaPas} class="mt-2 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Adaugă pas
          </button>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="testAsteptat">Rezultat Așteptat *</label>
          <textarea id="testAsteptat" bind:value={testRezultatAsteptat} class="block w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors" rows={2} placeholder="Ce ar trebui să se întâmple"></textarea>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="testObtinut">Rezultat Obținut</label>
          <textarea id="testObtinut" bind:value={testRezultatObtinut} class="block w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors" rows={2} placeholder="Ce s-a întâmplat de fapt"></textarea>
        </div>

        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="testScreenshot">Screenshot-uri</label>
          {#if testAtasamentePastrate.length > 0}
            <div class="mb-2 flex flex-wrap gap-1.5">
              {#each testAtasamentePastrate as a}
                <div class="relative">
                  <img src={a.cale} alt="Atasament" class="h-14 w-20 rounded border border-slate-200 object-cover" />
                  <button on:click={() => eliminaAtasamentExistent(a.id)} type="button" class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow hover:bg-red-600 transition-colors cursor-pointer">✕</button>
                </div>
              {/each}
            </div>
          {/if}
          {#if previewUrls.length > 0}
            <div class="mb-2 flex flex-wrap gap-1.5">
              {#each previewUrls as url, i}
                <div class="relative">
                  <img src={url} alt="Previzualizare" class="h-14 w-20 rounded border border-slate-200 object-cover" />
                  <button on:click={() => eliminaFisierNou(i)} type="button" class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow hover:bg-red-600 transition-colors cursor-pointer">✕</button>
                </div>
              {/each}
            </div>
          {/if}
          <input id="testScreenshot" type="file" multiple accept="image/png, image/jpeg, image/gif, image/webp" on:change={adaugaFisiere} class="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200 file:cursor-pointer" />
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-3">
        <button on:click={() => { reseteazaFormular(); showAddTest = false; }} class="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">Anulează</button>
        <button on:click={adaugaTest} class="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer">
          {testEditatId ? 'Salvează modificările' : 'Creează testul'}
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Lightbox -->
{#if lightboxUrl}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80" role="dialog" aria-modal="true" on:click={inchideLightbox} on:keydown={(e) => { if (e.key === 'Escape') inchideLightbox(); if (e.key === 'ArrowLeft') lightboxPrev(); if (e.key === 'ArrowRight') lightboxNext(); }}>
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
