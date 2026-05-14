<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { toast } from '$lib/stores/toast';

  let nume = '';
  let email = '';
  let seSalveazaProfil = false;
  let mesajProfil = '';
  let eroareProfil = '';

  let parolaCurenta = '';
  let parolaNoua = '';
  let confirmareParola = '';
  let eroareParola = '';
  let seTrimiteParola = false;

  $: if ($page.data.user) {
    nume = $page.data.user.nume;
    email = $page.data.user.email;
  }

  $: parolaValida = parolaNoua.length >= 6;
  $: paroleCoincid = parolaNoua === confirmareParola && confirmareParola.length > 0;
  $: formaParolaValida = parolaCurenta.length > 0 && parolaValida && paroleCoincid;

  async function salveazaProfil() {
    if (!nume.trim() || seSalveazaProfil) return;
    seSalveazaProfil = true;
    mesajProfil = '';
    eroareProfil = '';

    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nume: nume.trim() })
    });

    const data = await res.json();
    seSalveazaProfil = false;

    if (!res.ok) {
      eroareProfil = data.error || 'A apărut o eroare';
      return;
    }

    mesajProfil = 'Profilul a fost actualizat cu succes!';
    toast.success('Profil actualizat cu succes');
  }

  function reseteazaFormularParola() {
    parolaCurenta = '';
    parolaNoua = '';
    confirmareParola = '';
    eroareParola = '';
    seTrimiteParola = false;
  }

  async function submitSchimbareParola() {
    if (!formaParolaValida || seTrimiteParola) return;
    seTrimiteParola = true;
    eroareParola = '';

    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parolaCurenta, parolaNoua })
    });

    seTrimiteParola = false;

    if (!res.ok) {
      const data = await res.json();
      eroareParola = data.error || 'A apărut o eroare';
      return;
    }

    goto('/login?parolaSchimbata=1');
  }
</script>

<div class="mx-auto max-w-2xl">
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Setări Cont</h1>
    <p class="mt-1 text-xs text-slate-400">Administrează-ți profilul și securitatea</p>
  </div>

  <!-- Profil -->
  <div class="rounded-md border border-slate-200 bg-white">
    <div class="border-b border-slate-100 px-5 py-3">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Profilul Meu</h2>
    </div>
    <div class="p-5">
      {#if mesajProfil}
        <div class="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">{mesajProfil}</div>
      {/if}
      {#if eroareProfil}
        <div class="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">{eroareProfil}</div>
      {/if}
      <form class="space-y-4" on:submit|preventDefault={salveazaProfil}>
        <div>
          <label for="nume" class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Nume</label>
          <input id="nume" type="text" required bind:value={nume}
            class="w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors"
            placeholder="Numele tău" />
        </div>
        <div>
          <label for="email" class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Email</label>
          <input id="email" type="email" readonly bind:value={email}
            class="w-full cursor-not-allowed rounded-md border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500" />
          <p class="mt-1 text-xs text-slate-400">Emailul nu poate fi modificat</p>
        </div>
        <div class="flex justify-end pt-1">
          <button type="submit" disabled={seSalveazaProfil}
            class="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            {seSalveazaProfil ? 'Se salvează...' : 'Salvează'}
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Securitate -->
  <div class="mt-4 rounded-md border border-slate-200 bg-white">
    <div class="border-b border-slate-100 px-5 py-3">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-slate-400">Securitate</h2>
    </div>
    <div class="p-5">
      {#if eroareParola}
        <div class="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">{eroareParola}</div>
      {/if}
      <form class="space-y-4" on:submit|preventDefault={submitSchimbareParola}>
        <div>
          <label for="parola-curenta" class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Parola curentă</label>
          <input id="parola-curenta" type="password" required bind:value={parolaCurenta}
            class="w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors"
            placeholder="Introdu parola curentă" />
        </div>
        <div>
          <label for="parola-noua" class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Noua parolă</label>
          <input id="parola-noua" type="password" required bind:value={parolaNoua}
            class="w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors {parolaNoua.length > 0 && !parolaValida ? '!border-rose-300' : ''}"
            placeholder="Minim 6 caractere" />
          {#if parolaNoua.length > 0 && !parolaValida}
            <p class="mt-1 text-xs text-rose-500">Parola trebuie să aibă cel puțin 6 caractere</p>
          {/if}
        </div>
        <div>
          <label for="confirmare-parola" class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Confirmare</label>
          <input id="confirmare-parola" type="password" required bind:value={confirmareParola}
            class="w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-colors {confirmareParola.length > 0 && !paroleCoincid ? '!border-rose-300' : ''}"
            placeholder="Reintrodu noua parolă" />
          {#if confirmareParola.length > 0 && !paroleCoincid}
            <p class="mt-1 text-xs text-rose-500">Parolele nu coincid</p>
          {/if}
        </div>
        <div class="flex items-center justify-end gap-2 pt-1">
          <button type="button" on:click={reseteazaFormularParola}
            class="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
            Anulează
          </button>
          <button type="submit" disabled={!formaParolaValida || seTrimiteParola}
            class="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
            {seTrimiteParola ? 'Se procesează...' : 'Schimbă parola'}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
