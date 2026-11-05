<script lang="ts">
  import { Badge, Modal, Label, Input, Textarea } from 'flowbite-svelte';
  import ConfirmModal from '../../components/ConfirmModal.svelte';
  import { EditOutline, TrashBinOutline, PlusOutline } from 'flowbite-svelte-icons';
  import api from '$lib/api';
  import type { ApiResponse } from '$lib/api';
  import { onMount } from 'svelte';
  import Menu from '../../components/Menu.svelte';
  import { page } from '$app/stores';

  interface MenuItem {
    id: number;
    nome: string;
    preco: number;
    categoria: string;
    resumo: string;
    descricao: string;
    promocao?: number | null;
    iniciopromocao?: string | null;
    fimpromocao?: string | null;
    imagem?: string | null;
  }

  interface UserAuth {
    id: number;
    role: 'admin' | 'user';
  }

  let items: MenuItem[] = [];
  
  // Categorias fixas estritas
  const categoriasList = ['Bebidas', 'Doces', 'Salgados'];
  let categoriaSelecionada = '';

  let loading = true;
  let error = '';
  let deletingId: number | null = null;
  let confirmOpen = false;
  let confirmTargetId: number | null = null;
  let filtro = '';
  let currentUser: UserAuth | null = null;
  let mobileMenuOpen = false;

  // Estado do Modal de Detalhes
  let modalDetailsOpen = false;
  let selectedItem: MenuItem | null = null;

  // Estado do Modal de Cadastro / Edição de Produto
  let modalFormOpen = false;
  let isEditing = false;
  let formId: number | null = null;
  let formNome = '';
  let formPreco: number | string = '';
  let formCategoria = 'Salgados';
  let formResumo = '';
  let formDescricao = '';
  let formImagem = '';
  let formError = '';
  let formSubmitting = false;
  let formFile: File | null = null;

  // Reatividade para verificação de Admin
  $: isAdmin = currentUser?.role?.toLowerCase() === 'admin' || 
              (currentUser as any)?.type?.toLowerCase() === 'admin';

  // Função para verificar se a promoção está ativa no momento atual
  function isPromocaoAtiva(item: MenuItem): boolean {
    if (!item.promocao) return false;
    const agora = new Date();
    const inicioValid = !item.iniciopromocao || agora >= new Date(item.iniciopromocao);
    const fimValid = !item.fimpromocao || agora <= new Date(item.fimpromocao);
    return inicioValid && fimValid;
  }

  function calcularPrecoFinal(item: MenuItem): number {
    if (isPromocaoAtiva(item) && item.promocao) {
      return Number(item.preco) * (1 - item.promocao / 100);
    }
    return Number(item.preco);
  }

  function openDetailsModal(item: MenuItem) {
    selectedItem = item;
    modalDetailsOpen = true;
  }

  function openConfirm(id: number) {
    confirmTargetId = id;
    confirmOpen = true;
  }

  function closeConfirm() {
    confirmOpen = false;
    confirmTargetId = null;
    deletingId = null;
  }

  function handleConfirm() {
    if (confirmTargetId !== null) {
      handleDelete(confirmTargetId);
    }
    confirmOpen = false;
    confirmTargetId = null;
  }

  function handleCancel() {
    closeConfirm();
  }

  async function handleDelete(id: number) {
    deletingId = id;
    error = '';
    try {
      const res = await api.delete(`/cardapio/${id}`);
      const body = res.data as ApiResponse<null>;
      if (!body.success) {
        error = body.message;
        return;
      }
      items = items.filter((item) => item.id !== id);
      if (selectedItem?.id === id) {
        modalDetailsOpen = false;
      }
    } catch (e: any) {
      console.error('Erro ao deletar item do cardápio:', e);
      const body = e.response?.data as ApiResponse<null> | undefined;
      error = body?.message || 'Erro ao remover item do cardápio.';
    } finally {
      deletingId = null;
    }
  }

  function openAddModal() {
    isEditing = false;
    formId = null;
    formNome = '';
    formPreco = '';
    formCategoria = categoriaSelecionada || 'Salgados';
    formResumo = '';
    formDescricao = '';
    formImagem = '';
    formFile = null;
    formError = '';
    modalFormOpen = true;
  }

  function openEditModal(item: MenuItem) {
    isEditing = true;
    formId = item.id;
    formNome = item.nome;
    formPreco = item.preco;
    formCategoria = item.categoria || 'Salgados';
    formResumo = item.resumo;
    formDescricao = item.descricao;
    formImagem = item.imagem || '';
    formFile = null;
    formError = '';
    modalFormOpen = true;
  }

  async function handleSubmit() {
    formError = '';
    formSubmitting = true;

    const formData = new FormData();
    formData.append('nome', formNome);
    formData.append('preco', String(formPreco));
    formData.append('categoria', formCategoria);
    formData.append('resumo', formResumo);
    formData.append('descricao', formDescricao);
    
    if (formFile) {
      formData.append('imagem', formFile);
    }

    try {
      const config = {
        headers: { 'Content-Type': 'multipart/form-data' }
      };

      if (isEditing && formId !== null) {
        const res = await api.put(`/cardapio/${formId}`, formData, config);
        const body = res.data as ApiResponse<MenuItem>;
        if (body.success && body.data) {
          items = items.map((i) => (i.id === formId ? body.data : i));
          modalFormOpen = false;
          await buscarCardapio();
        } else {
          formError = body.message || 'Erro ao atualizar item.';
        }
      } else {
        const res = await api.post('/cardapio', formData, config);
        const body = res.data as ApiResponse<MenuItem>;
        if (body.success && body.data) {
          items = [body.data, ...items];
          modalFormOpen = false;
          await buscarCardapio();
        } else {
          formError = body.message || 'Erro ao cadastrar item.';
        }
      }
    } catch (e: any) {
      console.error('Erro no salvamento:', e);
      const body = e.response?.data as ApiResponse<null> | undefined;
      formError = body?.message || 'Erro de comunicação com o servidor.';
    } finally {
      formSubmitting = false;
    }
  }

  onMount(async () => {
    loading = true;

    const categoriaUrl = $page.url.searchParams.get('categoria');
    if (categoriaUrl) {
      const catEncontrada = categoriasList.find(c => c.toLowerCase() === categoriaUrl.toLowerCase());
      if (catEncontrada) {
        categoriaSelecionada = catEncontrada;
      }
    }

    const token = typeof window !== 'undefined' ? sessionStorage.getItem('auth_token') : null;

    if (token) {
      try {
        const userRes = await api.get('/users/me');
        const resData = userRes.data;
        if (resData?.data) {
          currentUser = resData.data;
        } else if (resData?.user) {
          currentUser = resData.user;
        } else {
          currentUser = resData;
        }
      } catch (err) {
        currentUser = null;
      }
    } else {
      currentUser = null;
    }

    try {
      await buscarCardapio();
    } catch (e: any) {
      error = 'Erro ao carregar cardápio.';
    } finally {
      loading = false;
    }
  });

  $: filtro, categoriaSelecionada, buscarCardapio();

  async function buscarCardapio() {
    try {
      let endpoint = '/cardapio';
      if (filtro.trim() !== '') {
        endpoint = `/cardapio/busca/${encodeURIComponent(filtro.trim())}`;
      }
      const res = await api.get(endpoint);
      let dados = res.data.data ?? res.data ?? [];

      if (categoriaSelecionada && categoriaSelecionada.trim() !== '') {
        dados = dados.filter((i: MenuItem) => i.categoria?.toLowerCase() === categoriaSelecionada.toLowerCase());
      }

      items = dados;
    } catch (e: any) {
      console.error('Erro ao buscar no cardápio:', e);
    }
  }

  function formatarPreco(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor));
  }
</script>

<style>
  /* Força absoluta para o placeholder obedecer o tom claro / tertiary-50 */
  :global(.placeholder-claro::placeholder) {
    color: var(--color-tertiary-100, #fdf8f6) !important;
    opacity: 1 !important;
  }
  :global(.placeholder-claro::-webkit-input-placeholder) {
    color: var(--color-tertiary-100, #fdf8f6) !important;
    opacity: 1 !important;
  }
  :global(.placeholder-claro::-moz-placeholder) {
    color: var(--color-tertiary-100, #fdf8f6) !important;
    opacity: 1 !important;
  }
</style>


<Menu />

<main class="mx-auto pt-36 md:pt-55 text-primary-50 max-w-7xl px-4 md:px-8">
  <div class="mx-auto">
    {#if loading}
      <div class="my-16 text-center text-neutral-400 font-medium uppercase tracking-widest animate-pulse text-sm">
        Carregando cardápio...
      </div>
    {:else if error}
      <div class="my-8 text-center text-red-500 font-semibold text-sm tracking-wide max-w-xl mx-auto bg-red-950/20 p-4 border border-red-900/40 rounded-2xl">
        {error}
      </div>
    {:else}
      
      <!-- Barra de Categorias Fixa (2 em cima e 2 embaixo) -->
      <div class="w-full mb-8">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto px-2">
          <!-- Botão "Todas" -->
          <button
            type="button"
            class={`w-full py-2.5 px-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 rounded-xl border cursor-pointer shadow-sm text-center ${
              !categoriaSelecionada 
                ? 'bg-tertiary-500 text-primary-950 border-tertiary-400 scale-[1.02] shadow-tertiary-500/20 shadow-md' 
                : 'bg-primary-900/80 text-primary-200 border-primary-700/80 hover:border-tertiary-500 hover:text-white'
            }`}
            on:click={() => { categoriaSelecionada = ''; }}
          >
             Todas
          </button>

          <!-- Listagem Dinâmica das Categorias -->
          {#each categoriasList as cat}
            <button
              type="button"
              class={`w-full py-2.5 px-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 rounded-xl border cursor-pointer shadow-sm text-center ${
                categoriaSelecionada === cat 
                  ? 'bg-tertiary-500 text-primary-950 border-tertiary-400 scale-[1.02] shadow-tertiary-500/20 shadow-md' 
                  : 'bg-primary-900/80 text-primary-200 border-primary-700/80 hover:border-tertiary-500 hover:text-white'
              }`}
              on:click={() => { categoriaSelecionada = cat; }}
            >
              {cat}
            </button>
          {/each}
        </div>
      </div>

     <!-- Topo: Campo de Pesquisa e Botão Novo Item -->
     <div class="w-full mx-auto pb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        
   <!-- Input de Pesquisa Estilizado com Ícone de Lupa -->
   <div class="relative w-full sm:w-96">
    <span class="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-tertiary-400">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
    </span>
    <input
      type="text"
      placeholder="Pesquisar delícias no cardápio..."
      style="color-scheme: dark;"
      class="w-full bg-primary-900/90 border-2 border-tertiary-600/50 rounded-2xl text-white font-medium text-xs md:text-sm tracking-wide focus:outline-none focus:border-tertiary-400 focus:ring-2 focus:ring-tertiary-400/30 pl-11 pr-4 py-3 shadow-lg transition-all placeholder-claro"
      bind:value={filtro}
    />
  </div>
      {#if isAdmin}
        <button
          type="button"
          class="flex items-center justify-center gap-2.5 bg-gradient-to-r from-tertiary-500 to-tertiary-600 hover:from-tertiary-400 hover:to-tertiary-500 text-primary-950 font-black px-6 py-3.5 rounded-2xl uppercase tracking-wider text-xs transition-all duration-300 border-2 border-tertiary-400 cursor-pointer shadow-xl hover:shadow-tertiary-500/30 hover:-translate-y-0.5 w-full sm:w-auto"
          on:click={openAddModal}
        >
          <PlusOutline class="w-4 h-4 text-primary-950 stroke-[3]" />
          Adicionar Item
        </button>
      {/if}
    </div>

      <!-- Grid do Cardápio (Responsivo unificado e fluido) -->
      <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 w-full">
        {#each items as item}
          {@const promoAtiva = isPromocaoAtiva(item)}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="w-full p-0 overflow-hidden shadow-xl border-2 border-tertiary-600/60 bg-primary-800 rounded-2xl md:rounded-3xl flex flex-col justify-between cursor-pointer hover:border-tertiary-400 hover:scale-[1.02] transition-all duration-300 group relative"
            on:click={() => window.location.href = `/Cardapio/${item.id}`}
          >
            <div>
              <div class="relative w-full h-36 md:h-48 bg-primary-900/60 border-b-2 border-tertiary-600/40 overflow-hidden flex items-center justify-center">
                {#if item.imagem}
                  <img src={item.imagem} alt={item.nome} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                {:else}
                  <div class="text-tertiary-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                    <span>Sem Imagem</span>
                  </div>
                {/if}

                {#if item.categoria}
                  <Badge class="absolute top-2.5 left-2.5 bg-tertiary-600/90 text-primary-50 border border-tertiary-400/80 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 shadow-md backdrop-blur-sm">
                    {item.categoria}
                  </Badge>
                {/if}

                {#if promoAtiva}
                  <Badge class="absolute top-2.5 right-2.5 bg-red-600 text-white border border-red-400 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 shadow-lg animate-pulse">
                    🔥 -{item.promocao}%
                  </Badge>
                {/if}
              </div>

              <div class="px-3.5 md:px-5 pt-3 md:pt-4 pb-1.5 flex items-start justify-between">
                <h3 class="text-sm md:text-lg font-black text-primary-50 text-left leading-tight group-hover:text-tertiary-300 transition-colors line-clamp-2">
                  {item.nome}
                </h3>

                {#if isAdmin}
                  <div class="flex gap-1 shrink-0 ml-1.5">
                    <button
                      type="button"
                      class="p-1.5 md:p-2 rounded-full bg-primary-700 border border-primary-600 hover:bg-tertiary-500 hover:text-primary-950 text-tertiary-200 transition-all duration-200 shadow-sm z-10 cursor-pointer"
                      title="Editar Item"
                      on:click|stopPropagation={() => openEditModal(item)}
                    >
                      <EditOutline class="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                    <button
                      type="button"
                      title="Remover Item"
                      class="p-1.5 md:p-2 rounded-full bg-primary-700 border border-primary-600 hover:bg-red-600 hover:text-white text-red-300 transition-all duration-200 shadow-sm z-10 cursor-pointer"
                      on:click|stopPropagation={() => openConfirm(item.id)}
                      disabled={deletingId === item.id || loading}
                    >
                      <TrashBinOutline class="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                  </div>
                {/if}
              </div>

              <div class="px-3.5 md:px-5 py-1 text-left">
                <p class="text-primary-200 text-[11px] md:text-xs font-medium leading-relaxed line-clamp-2">
                  {item.resumo}
                </p>
              </div>
            </div>

            <div class="px-3.5 md:px-5 pb-3.5 md:pb-4 pt-2.5 md:pt-3 flex justify-between items-center mt-auto border-t border-primary-700/80 mx-2.5 md:mx-3">
              <span class="text-[10px] md:text-xs text-primary-300 font-bold uppercase tracking-wider">Valor</span>
              <div class="text-right">
                {#if promoAtiva}
                  <span class="block text-[9px] md:text-[10px] text-gray-400 line-through">
                    {formatarPreco(item.preco)}
                  </span>
                {/if}
                <span class="text-xs md:text-base font-black text-primary-950 bg-tertiary-400 px-2.5 md:px-3.5 py-0.5 md:py-1 rounded-xl md:rounded-2xl border border-tertiary-300 shadow-md inline-block">
                  {formatarPreco(calcularPrecoFinal(item))}
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>

    {/if}
  </div>
</main>

<!-- Modal de Detalhes do Produto -->
{#if selectedItem}
  <Modal 
    bind:open={modalDetailsOpen} 
    title={selectedItem.nome} 
    size="md" 
    autoclose={false} 
    class="bg-neutral-950/90 border border-neutral-800 shadow-2xl backdrop-blur-xl" 
    headerClass="text-amber-500 font-bold uppercase tracking-wider border-b border-neutral-800"
  >
    <div class="space-y-4 text-left">
      {#if selectedItem.imagem}
        <div class="w-full h-56 bg-neutral-900 border border-neutral-800 overflow-hidden flex items-center justify-center">
          <img src={selectedItem.imagem} alt={selectedItem.nome} class="w-full h-full object-cover" />
        </div>
      {/if}

      <div class="flex items-center justify-between border-b border-neutral-800 pb-3">
        {#if selectedItem.categoria}
          <Badge class="bg-amber-600/20 text-amber-500 border border-amber-600/40 rounded-none text-xs font-bold uppercase px-3 py-1">
            {selectedItem.categoria}
          </Badge>
        {/if}
        <div class="text-right">
          {#if isPromocaoAtiva(selectedItem)}
            <span class="block text-xs text-neutral-400 line-through">
              {formatarPreco(selectedItem.preco)}
            </span>
          {/if}
          <span class="text-2xl font-black text-amber-500">
            {formatarPreco(calcularPrecoFinal(selectedItem))}
          </span>
        </div>
      </div>

      <div>
        <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Resumo</h4>
        <p class="text-neutral-200 text-sm italic bg-neutral-900/50 p-2.5 border-l-2 border-amber-600">
          {selectedItem.resumo}
        </p>
      </div>

      <div>
        <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Descrição Completa</h4>
        <p class="text-neutral-300 text-sm leading-relaxed whitespace-pre-line bg-neutral-900/30 p-3 border border-neutral-800">
          {selectedItem.descricao}
        </p>
      </div>
    </div>

    <div class="flex justify-between items-center pt-4 border-t border-neutral-800 mt-6">
      <button
        type="button"
        class="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold px-4 py-2 text-xs uppercase border border-neutral-600 cursor-pointer transition-colors"
        on:click={() => (modalDetailsOpen = false)}
      >
        Fechar
      </button>

      {#if isAdmin}
        <button
          type="button"
          class="bg-amber-600 hover:bg-amber-700 text-neutral-950 font-bold px-4 py-2 text-xs uppercase border border-black cursor-pointer transition-colors"
          on:click={() => {
            modalDetailsOpen = false;
            if (selectedItem) openEditModal(selectedItem);
          }}
        >
          Editar Produto
        </button>
      {/if}
    </div>
  </Modal>
{/if}

<!-- Modal de Adicionar / Editar Item -->
<Modal 
  bind:open={modalFormOpen} 
  title={isEditing ? '✒️ Editar Item do Cardápio' : '➕ Adicionar Novo Item'} 
  size="md" 
  autoclose={false} 
  class="bg-primary-900/95 border-2 border-tertiary-600/80 shadow-2xl rounded-3xl backdrop-blur-xl" 
  classes={{ header: "text-tertiary-300 font-black text-base uppercase tracking-wider border-b border-tertiary-600/40 pb-3" }}
>
  <form on:submit|preventDefault={handleSubmit} class="space-y-4 pt-2">
    {#if formError}
      <div class="p-3 bg-red-950/60 border border-red-500/80 text-red-300 text-xs rounded-xl font-medium tracking-wide">
        ⚠️ {formError}
      </div>
    {/if}

    <div>
      <Label for="nome" class="text-[11px] font-bold uppercase tracking-widest text-tertiary-300 mb-1">Nome do Item *</Label>
      <Input 
        id="nome" 
        type="text" 
        placeholder="Ex: Coxinha de Frango" 
        bind:value={formNome} 
        required 
        class="bg-primary-950/60 border border-tertiary-600/60 text-primary-50 rounded-xl text-sm p-3 focus:outline-none focus:border-tertiary-400 focus:ring-1 focus:ring-tertiary-400 transition-all placeholder:text-primary-300/40"
      />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label for="preco" class="text-[11px] font-bold uppercase tracking-widest text-tertiary-300 mb-1">Preço (R$) *</Label>
        <Input 
          id="preco" 
          type="number" 
          step="0.01" 
          min="0" 
          placeholder="0.00" 
          bind:value={formPreco} 
          required 
          class="bg-primary-950/60 border border-tertiary-600/60 text-primary-50 rounded-xl text-sm p-3 focus:outline-none focus:border-tertiary-400 focus:ring-1 focus:ring-tertiary-400 transition-all placeholder:text-primary-300/40"
        />
      </div>
      <div>
        <Label for="categoria" class="text-[11px] font-bold uppercase tracking-widest text-tertiary-300 mb-1">Categoria *</Label>
        <select 
          id="categoria" 
          bind:value={formCategoria} 
          class="w-full bg-primary-950/60 border border-tertiary-600/60 text-primary-50 text-sm p-3 rounded-xl focus:outline-none focus:border-tertiary-400 focus:ring-1 focus:ring-tertiary-400 transition-all cursor-pointer"
          required
        >
          {#each categoriasList as cat}
            <option value={cat} class="bg-primary-900 text-primary-50">{cat}</option>
          {/each}
        </select>
      </div>
    </div>

    <div>
      <Label for="resumo" class="text-[11px] font-bold uppercase tracking-widest text-tertiary-300 mb-1">Resumo *</Label>
      <Input 
        id="resumo" 
        type="text" 
        placeholder="Breve descrição em uma linha..." 
        bind:value={formResumo} 
        required 
        class="bg-primary-950/60 border border-tertiary-600/60 text-primary-50 rounded-xl text-sm p-3 focus:outline-none focus:border-tertiary-400 focus:ring-1 focus:ring-tertiary-400 transition-all placeholder:text-primary-300/40"
      />
    </div>

    <div>
      <Label for="descricao" class="text-[11px] font-bold uppercase tracking-widest text-tertiary-300 mb-1">Descrição Completa *</Label>
      <Textarea 
        id="descricao" 
        rows="3" 
        placeholder="Detalhes dos ingredientes, modo de preparo, etc." 
        bind:value={formDescricao} 
        required 
        class="bg-primary-950/60 border border-tertiary-600/60 text-primary-50 rounded-xl text-sm p-3 focus:outline-none focus:border-tertiary-400 focus:ring-1 focus:ring-tertiary-400 transition-all placeholder:text-primary-300/40 resize-none"
      />
    </div>

    <div>
      <Label class="text-[11px] font-bold uppercase tracking-widest text-tertiary-300 mb-1">Imagem do Produto *</Label>
      
      <div class="flex items-center gap-3">
        <label class="cursor-pointer bg-primary-950/80 hover:bg-primary-950 text-tertiary-300 hover:text-tertiary-200 border border-tertiary-600/60 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm">
          <span>📁 Selecionar Arquivo</span>
          <input 
            type="file" 
            accept="image/*"
            class="hidden" 
            on:change={(e) => {
              const target = e.target as HTMLInputElement;
              if (target.files && target.files[0]) {
                formFile = target.files[0];
                formImagem = URL.createObjectURL(target.files[0]);
              }
            }}
          />
        </label>
    
        {#if formFile}
          <span class="text-xs text-primary-200 truncate max-w-[200px]" title={formFile.name}>
            {formFile.name}
          </span>
        {:else}
          <span class="text-xs text-primary-400 italic">Nenhum arquivo escolhido</span>
        {/if}
      </div>
    </div>
    
    {#if formImagem}
      <div class="mt-3 p-2 bg-primary-950/40 border border-tertiary-600/30 rounded-xl flex items-center gap-3">
        <img src={formImagem} alt="Pré-visualização" class="w-14 h-14 rounded-lg object-cover border border-tertiary-500/50 shadow-md" />
        <div>
          <span class="block text-xs text-tertiary-300 font-bold uppercase">Pré-visualização</span>
          <span class="text-[11px] text-primary-300">Pronta para envio</span>
        </div>
      </div>
    {/if}

    <div class="flex justify-end gap-3 pt-4 border-t border-tertiary-600/40 mt-6">
      <button
        type="button"
        class="bg-primary-800 hover:bg-primary-700 text-primary-200 font-bold px-5 py-2.5 text-xs uppercase tracking-wider rounded-xl transition-all duration-200 border border-primary-600 cursor-pointer"
        on:click={() => (modalFormOpen = false)}
      >
        Cancelar
      </button>

      <button
        type="submit"
        class="bg-tertiary-500 hover:bg-tertiary-400 text-primary-950 font-black px-6 py-2.5 text-xs uppercase tracking-wider rounded-xl transition-all duration-200 border border-tertiary-400 shadow-lg cursor-pointer disabled:opacity-50"
        disabled={formSubmitting}
      >
        {formSubmitting ? 'Salvando...' : isEditing ? 'Atualizar Item' : 'Cadastrar Item'}
      </button>
    </div>
  </form>
</Modal>

<ConfirmModal
  open={confirmOpen}
  message="Tem certeza que deseja remover este item do cardápio?"
  confirmText="Remover"
  cancelText="Cancelar"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>