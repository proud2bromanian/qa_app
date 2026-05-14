<script lang="ts">
  export let message = 'Nu există date';
  export let description = '';
  export let actionText = '';
  export let actionHref = '';
</script>

<div class="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
  <p class="text-sm text-slate-500">{message}</p>
  {#if description}
    <p class="mt-1 text-xs text-slate-400">{description}</p>
  {/if}
  {#if actionText && actionHref}
    <a href={actionHref} class="mt-3 inline-block text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-800">{actionText}</a>
  {/if}
</div>
