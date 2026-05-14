<script lang="ts">
  import { currentUser } from '$lib/stores/auth';
  import { goto, invalidateAll } from '$app/navigation';

  let nume = '';
  let email = '';
  let parola = '';
  let confirmParola = '';
  let eroare = '';
  let incarcare = false;

  async function handleSubmit(e: Event) {
    e.preventDefault();
    eroare = '';
    if (parola !== confirmParola) { eroare = 'Parolele nu coincid'; return; }
    if (parola.length < 6) { eroare = 'Parola trebuie să aibă cel puțin 6 caractere'; return; }
    incarcare = true;
    try {
      const r = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nume, parola })
      });
      const data = await r.json();
      if (!r.ok) { eroare = data.error; return; }
      currentUser.set(data);
      await invalidateAll();
      goto('/dashboard');
    } catch { eroare = 'Eroare de conexiune'; }
    finally { incarcare = false; }
  }
</script>

<div class="flex min-h-[70vh] items-center justify-center">
  <div class="w-full max-w-sm">
    <div class="text-center mb-8">
      <div class="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white text-sm font-bold mb-3">Q</div>
      <h1 class="text-xl font-bold text-slate-900 tracking-tight">Înregistrare</h1>
    </div>

    <form on:submit={handleSubmit} class="rounded-md border border-slate-200 bg-white p-6 space-y-4">
      {#if eroare}
        <div class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">{eroare}</div>
      {/if}
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="nume">Nume complet</label>
        <input id="nume" type="text" bind:value={nume} class="block w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors" required placeholder="Numele dumneavoastră" />
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="email">Email</label>
        <input id="email" type="email" bind:value={email} class="block w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors" required placeholder="nume@exemplu.ro" />
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="parola">Parolă</label>
        <input id="parola" type="password" bind:value={parola} class="block w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors" required placeholder="Minim 6 caractere" />
      </div>
      <div>
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5" for="confirmParola">Confirmă parola</label>
        <input id="confirmParola" type="password" bind:value={confirmParola} class="block w-full rounded-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm placeholder-slate-300 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors" required placeholder="Repetă parola" />
      </div>
      <button type="submit" disabled={incarcare} class="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
        {incarcare ? 'Se procesează...' : 'Înregistrare'}
      </button>
    </form>

    <p class="mt-4 text-center text-xs text-slate-400">
      Aveți deja cont? <a href="/login" class="font-medium text-slate-700 hover:text-slate-900 transition-colors">Autentificați-vă</a>
    </p>
  </div>
</div>
