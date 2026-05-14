<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { currentUser } from '$lib/stores/auth';
  import { page } from '$app/stores';
  import { goto, invalidateAll } from '$app/navigation';
  import Toasts from '$lib/components/Toasts.svelte';

  export let data: {
    user: { id: string; email: string; nume: string } | null;
    proiecte: { id: string; nume: string }[];
    rolCurent: string | null;
    proiectCurent: { id: string; nume: string } | null;
  };

  onMount(() => {
    currentUser.set(data.user);
  });

  $: if (data.user) {
    currentUser.set(data.user);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    currentUser.set(null);
    await invalidateAll();
    goto('/login');
  }

  $: isAuthenticated = !!data.user;
  $: bazaProiect = data.proiectCurent ? `/projects/${data.proiectCurent.id}` : '';
  $: sectiuneActiva = (() => {
    const pid = $page.params.id;
    if (!pid) return '';
    const path = $page.url.pathname;
    if (path.startsWith(`/projects/${pid}/dashboard`)) return 'dashboard';
    if (path.startsWith(`/projects/${pid}/test-cases`)) return 'teste';
    if (path.startsWith(`/projects/${pid}/test-suites`)) return 'suite';
    if (path.startsWith(`/projects/${pid}/executions`)) return 'executii';
    if (path.startsWith(`/projects/${pid}/bugs`)) return 'buguri';
    if (path.startsWith(`/projects/${pid}/settings`)) return 'setari';
    return '';
  })();
  $: sectiuneGlobala = (() => {
    const path = $page.url.pathname;
    if (path === '/dashboard' || path.startsWith('/dashboard')) return 'dashboard';
    if (path === '/projects' || path.startsWith('/projects/')) return 'proiecte';
    return '';
  })();

  function navigheazaLaProiect(event: Event) {
    const select = event.target as HTMLSelectElement;
    const val = select.value;
    if (val) {
      goto(`/projects/${val}/dashboard`);
    }
  }

  function navigheazaLaProiectDinLista(e: Event) {
    const val = (e.currentTarget as HTMLSelectElement).value;
    if (val) goto(`/projects/${val}/dashboard`);
  }
</script>

<div class="min-h-screen bg-slate-100">
  {#if isAuthenticated}
    <!-- Sidebar -->
    <aside class="fixed left-0 top-0 z-40 h-full w-64 bg-white border-r border-slate-200 flex flex-col">
      <!-- Logo -->
      <div class="flex items-center gap-2.5 h-14 px-5 border-b border-slate-100 shrink-0">
        <div class="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white text-xs font-bold">Q</div>
        <span class="text-sm font-bold text-slate-900 tracking-tight">QA Manager</span>
      </div>

      <!-- Project Selector -->
      {#if data.proiectCurent}
        <div class="px-3 pt-3 pb-2 shrink-0">
          <select
            class="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-700 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer"
            on:change={navigheazaLaProiect}
          >
            {#each data.proiecte as p}
              <option value={p.id} selected={p.id === data.proiectCurent.id}>{p.nume}</option>
            {/each}
          </select>
        </div>
      {:else}
        <div class="px-3 pt-3 pb-2 shrink-0">
          <select
            class="w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm font-medium text-slate-700 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 cursor-pointer"
            on:change={navigheazaLaProiectDinLista}
          >
            <option value="">Selectați proiectul...</option>
            {#each data.proiecte as p}
              <option value={p.id}>{p.nume}</option>
            {/each}
          </select>
        </div>
      {/if}

      <!-- Navigation -->
      {#if data.proiectCurent}
        <nav class="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <a href={bazaProiect + '/dashboard'} class="flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors {sectiuneActiva === 'dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}">
            <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"/></svg>
            Dashboard
          </a>
          <a href={bazaProiect + '/test-cases'} class="flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors {sectiuneActiva === 'teste' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}">
            <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            Cazuri de Test
          </a>
          <a href={bazaProiect + '/test-suites'} class="flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors {sectiuneActiva === 'suite' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}">
            <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            Suite de Teste
          </a>
          <a href={bazaProiect + '/executions'} class="flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors {sectiuneActiva === 'executii' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}">
            <svg class="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            Execuții
          </a>
          <a href={bazaProiect + '/bugs'} class="flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors {sectiuneActiva === 'buguri' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}">
            <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Bug-uri
          </a>
          {#if data.rolCurent === 'administrator'}
            <a href={bazaProiect + '/settings'} class="flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors {sectiuneActiva === 'setari' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}">
              <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Setări
            </a>
          {/if}

          <div class="pt-2 mt-2 border-t border-slate-100">
            <a href="/projects" class="flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
              <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/></svg>
              Toate proiectele
            </a>
          </div>
        </nav>
      {:else}
        <nav class="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <a href="/dashboard" class="flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors {sectiuneGlobala === 'dashboard' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}">
            <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"/></svg>
            Dashboard
          </a>
          <a href="/projects" class="flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors {sectiuneGlobala === 'proiecte' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}">
            <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/></svg>
            Proiecte
          </a>
        </nav>
      {/if}

      <!-- User Footer -->
      <div class="border-t border-slate-100 px-3 py-3 shrink-0">
        <div class="flex items-center gap-2.5">
          <a href="/account/settings" class="flex items-center gap-2.5 flex-1 min-w-0 rounded-md px-2 py-1.5 hover:bg-slate-50 transition-colors">
            <div class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 shrink-0">
              {(data.user?.nume || '?')[0]}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-800 truncate">{data.user?.nume || 'Utilizator'}</p>
              <p class="text-xs text-slate-400 truncate">{data.rolCurent === 'administrator' ? 'Admin' : 'Membru'}</p>
            </div>
          </a>
          <button on:click={logout} title="Deconectare" class="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer shrink-0">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="ml-64 min-h-screen bg-slate-100">
      <main class="p-6 lg:p-8">
        <slot />
      </main>
    </div>

  {:else}
    <!-- Unauthenticated layout -->
    <nav class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <a href="/" class="flex items-center gap-2.5">
          <div class="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white text-xs font-bold">Q</div>
          <span class="text-sm font-bold text-slate-900 tracking-tight">QA Manager</span>
        </a>
        <div class="flex items-center gap-2">
          <a href="/login" class="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">Autentificare</a>
          <a href="/register" class="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors">Înregistrare</a>
        </div>
      </div>
    </nav>
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <slot />
    </main>
  {/if}
</div>

<Toasts />
