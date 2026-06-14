<script lang="ts">
  import { Modal } from 'flowbite-svelte';
  import { CloseOutline, ExclamationCircleOutline } from 'flowbite-svelte-icons';

  export let open = false; 
  export let message = 'Tem certeza?'; 
  export let confirmText = 'Confirmar'; 
  export let cancelText = 'Cancelar'; 
  export let onConfirm: () => void; 
  export let onCancel: () => void;

  // Reage quando o Flowbite fecha o modal internamente (clique fora)
  $: if (!open) {
    // Só dispara o cancelamento se o fluxo não foi interrompido por clique no botão
    // Isso limpa o "deletingId" e permite clicar novamente nos botões
    onCancel();
  }
</script>

<Modal 
  bind:open={open} 
  size="sm" 
  autoclose
  class="z-50 !rounded-none !bg-secondary-300/95 backdrop-blur-md border border-primary-350 shadow-2xl"
  dialogClass="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/40 backdrop-blur-sm"
>
  <div slot="header" class="w-full flex items-center justify-between bg-transparent px-5 pt-5 pb-2 border-b border-neutral-800/10">
    <div class="flex items-center gap-2">
      <ExclamationCircleOutline class="w-4 h-4 text-red-500 " />
      <span class="text-xs font-black tracking-[0.2em] uppercase font-serif text-secondary-600">Confirmação</span>
    </div>
    <button 
      type="button" 
      on:click={onCancel} 
      aria-label="Fechar"
      class="text-neutral-500 hover:text-neutral-900 transition-colors"
    >
      <CloseOutline class="w-4 h-4 bg-primary-100" />
    </button>
  </div>

  <form method="dialog" class="flex flex-col gap-6 p-5 bg-transparent">
    <div class="text-xs text-neutral-800 text-center text-primary-900 leading-relaxed font-medium tracking-wide my-2">
      {message}
    </div>
    
    <div class="flex justify-center gap-3 mt-2">
      <button 
        type="button" 
        on:click={onCancel}
        class="flex-1 bg-tertiary-400 border border-primary-500 hover:border-neutral-800 hover:bg-neutral-800/10 text-primary-900 font-bold uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-none transition-all duration-300 select-none"
      >
        {cancelText}
      </button>
      
      <button 
        type="button" 
        on:click={onConfirm}
        class="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-[10px] px-4 py-2.5 rounded-none border border-red-700 transition-all duration-300 shadow-lg shadow-red-900/20"
      >
        {confirmText}
      </button>
    </div>
  </form>
</Modal>

<style>
  :global(.rounded-lg) {
    border-radius: 0px !important;
  }
</style>