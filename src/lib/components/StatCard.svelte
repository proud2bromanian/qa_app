<script lang="ts">
  export let label: string;
  export let value: string | number;
  export let color = 'text-slate-900';
</script>

<div class="rounded-md border border-slate-200 bg-white px-4 py-3">
  <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
  <p class="mt-1 text-xl font-bold font-mono tabular-nums {color}">{value}</p>
</div>
