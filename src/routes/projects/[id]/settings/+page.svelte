<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { toast } from '$lib/stores/toast';

  let proiect: any = null;
  let incarcare = true;
  let eroare = '';
  let inviteCod = '';
  let inviteLink = '';
  let copiat = false;
  let showDeleteStep1 = false;
  let showDeleteStep2 = false;
  let confirmNume = '';

  const projectId = $page.params.id;

  async function incarcaProiect() {
    try {
      const r = await fetch(`/api/projects/${projectId}`);
      const p = await r.json();
      if (p.error) { eroare = p.error; return; }
      proiect = p;
    } catch { eroare = 'Eroare la încărcare'; }
    incarcare = false;
  }

  onMount(incarcaProiect);

  async function genereazaInvitatie() {
    const r = await fetch(`/api/projects/${projectId}/invitations`, { method: 'POST' });
    const data = await r.json();
    if (data.cod) {
      inviteCod = data.cod;
      inviteLink = `${window.location.origin}/projects/${projectId}/join?cod=${data.cod}`;
    }
  }

  async function copiazaLink() {
    await navigator.clipboard.writeText(inviteLink);
    copiat = true;
    toast.success('Link copiat în clipboard');
    setTimeout(() => copiat = false, 2000);
  }

  function stergeProiect() {
    showDeleteStep1 = false;
    showDeleteStep2 = false;
    fetch(`/api/projects/${projectId}`, { method: 'DELETE' }).then(() => goto('/projects'));
  }
</script>

<div class="space-y-5">
  <div>
    <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Setări</h1>
    <p class="mt-1 text-xs text-slate-400">Gestionează accesul și membrii proiectului</p>
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
  {:else}
    <!-- Invitations -->
    <div class="rounded-md border border-slate-200 bg-white">
      <div class="border-b border-slate-100 px-5 py-3">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Invitații & Acces</h3>
      </div>
      <div class="p-5">
        <p class="text-xs text-slate-500 mb-3">Generați un cod de invitație pentru a adăuga membri în proiect.</p>
        <button on:click={genereazaInvitatie} class="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer">Generează cod</button>
        {#if inviteCod}
          <div class="mt-4 rounded-md bg-slate-50 border border-slate-200 px-4 py-3">
            <p class="text-xs text-slate-600">Cod: <span class="font-mono font-bold text-slate-900">{inviteCod}</span></p>
            <p class="mt-1 text-xs font-mono text-slate-400 break-all">{inviteLink}</p>
            <button on:click={copiazaLink} class="mt-2 inline-flex items-center gap-1 rounded-md {copiat ? 'bg-emerald-600' : 'bg-slate-900'} px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-colors cursor-pointer">
              {#if copiat}
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                Copiat!
              {:else}
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                Copiază
              {/if}
            </button>
          </div>
        {/if}
      </div>
    </div>

    <!-- Members -->
    <div class="rounded-md border border-slate-200 bg-white">
      <div class="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Membri</h3>
        <span class="text-xs font-mono text-slate-300">{proiect.membri?.length || 0}</span>
      </div>
      <div class="divide-y divide-slate-100">
        {#each proiect.membri || [] as m}
          <div class="flex items-center gap-3 px-5 py-3">
            <div class="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 shrink-0">
              {(m.user.nume || '?')[0]}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-800 truncate">{m.user.nume}</p>
              <p class="text-xs text-slate-400 truncate">{m.user.email}</p>
            </div>
            <span class="shrink-0 rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider {m.rol === 'administrator' ? 'bg-slate-100 text-slate-700' : 'bg-slate-50 text-slate-400'}">
              {m.rol === 'administrator' ? 'ADMIN' : 'MEMBRU'}
            </span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Danger Zone -->
    <div class="rounded-md border border-rose-200 bg-rose-50/30">
      <div class="border-b border-rose-100 px-5 py-3">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-rose-500">Zonă Periculoasă</h3>
      </div>
      <div class="p-5">
        <p class="text-xs text-slate-500 mb-3">Ștergerea proiectului este ireversibilă. Toate datele vor fi distruse permanent.</p>
        <button on:click={() => showDeleteStep1 = true} class="rounded-md border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer">Șterge proiectul</button>
      </div>
    </div>
  {/if}
</div>

<!-- Delete Modal Step 1 -->
{#if showDeleteStep1}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" tabindex="-1" on:click={() => showDeleteStep1 = false} on:keydown={(e) => { if (e.key === 'Escape') showDeleteStep1 = false; }}>
    <div class="w-full max-w-md rounded-lg bg-white shadow-2xl" on:click|stopPropagation>
      <div class="border-b border-slate-200 px-6 py-4">
        <h3 class="text-sm font-semibold text-rose-700">Șterge proiectul</h3>
      </div>
      <div class="px-6 py-5">
        <p class="text-xs text-slate-600">Pentru a confirma, tastați numele proiectului:</p>
        <p class="mt-2 text-sm font-mono font-bold text-slate-900">"{proiect?.nume}"</p>
        <input bind:value={confirmNume} placeholder="Tastați numele proiectului" class="mt-3 block w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400" />
      </div>
      <div class="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-3">
        <button on:click={() => { showDeleteStep1 = false; confirmNume = ''; }} class="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">Anulează</button>
        <button on:click={() => { if (confirmNume === proiect?.nume) { showDeleteStep1 = false; showDeleteStep2 = true; } else { toast.error('Numele introdus nu corespunde.'); } }} class="rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer">Confirmă</button>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Modal Step 2 -->
{#if showDeleteStep2}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions a11y-no-noninteractive-element-interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" tabindex="-1" on:click={() => showDeleteStep2 = false} on:keydown={(e) => { if (e.key === 'Escape') showDeleteStep2 = false; }}>
    <div class="w-full max-w-md rounded-lg bg-white shadow-2xl" on:click|stopPropagation>
      <div class="border-b border-slate-200 px-6 py-4">
        <h3 class="text-sm font-semibold text-rose-700">Confirmare finală</h3>
      </div>
      <div class="px-6 py-5">
        <p class="text-xs text-slate-600">Sunteți absolut sigur? Toate datele acestui proiect vor fi șterse definitiv.</p>
      </div>
      <div class="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-3">
        <button on:click={() => { showDeleteStep2 = false; confirmNume = ''; }} class="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">Anulează</button>
        <button on:click={stergeProiect} class="rounded-md bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 transition-colors cursor-pointer">Da, șterge totul</button>
      </div>
    </div>
  </div>
{/if}
