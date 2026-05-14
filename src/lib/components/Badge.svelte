<script lang="ts">
  export let type: 'man' | 'auto' | 'status' = 'man';
  export let status: string = '';

  const typeStyles: Record<string, string> = {
    man: 'bg-sky-50 text-sky-600',
    auto: 'bg-violet-50 text-violet-600'
  };

  const statusStyles: Record<string, string> = {
    netestat: 'bg-slate-50 text-slate-500',
    trecut: 'bg-emerald-50 text-emerald-700',
    esuat: 'bg-rose-50 text-rose-700',
    blocat: 'bg-amber-50 text-amber-700',
    deschis: 'bg-rose-50 text-rose-700',
    in_lucru: 'bg-amber-50 text-amber-700',
    rezolvat: 'bg-sky-50 text-sky-700',
    inchis: 'bg-emerald-50 text-emerald-700',
    in_progres: 'bg-amber-50 text-amber-700',
    finalizat: 'bg-emerald-50 text-emerald-700'
  };

  const statusLabels: Record<string, string> = {
    netestat: 'NETESTAT',
    trecut: 'TRECUT',
    esuat: 'EȘUAT',
    blocat: 'BLOCAT',
    deschis: 'DESCHIS',
    in_lucru: 'ÎN LUCRU',
    rezolvat: 'REZOLVAT',
    inchis: 'ÎNCHIS',
    in_progres: 'ÎN PROGRES',
    finalizat: 'FINALIZAT'
  };

  $: style = type === 'status'
    ? (statusStyles[status] || 'bg-slate-50 text-slate-500')
    : typeStyles[type];
  $: label = type === 'status'
    ? (statusLabels[status] || status.toUpperCase())
    : (type === 'auto' ? 'AUTO' : 'MAN');
</script>

<span class="shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider {style}">
  {label}
</span>
