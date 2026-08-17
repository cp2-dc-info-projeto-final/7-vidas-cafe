<script lang="ts">
  import { Badge, Modal, Label, Input, Textarea } from 'flowbite-svelte';
  import ConfirmModal from '../../components/ConfirmModal.svelte';
  import { EditOutline, TrashBinOutline, PlusOutline } from 'flowbite-svelte-icons';
  import api from '$lib/api';
  import type { ApiResponse } from '$lib/api';
  import { onMount } from 'svelte';
  import Menu from '../../components/Menu.svelte';

  interface MenuItem {
    id: number;
    nome: string;
    preco: number;
    categoria: string;
    resumo: string;
    descricao: string;
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
  let mobileMenuOpen = false; // Estado do menu hambúrguer

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

  // Reatividade para verificação de Admin
  $: isAdmin = currentUser?.role?.toLowerCase() === 'admin' || 
              (currentUser as any)?.type?.toLowerCase() === 'admin';

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
    formError = '';
    modalFormOpen = true;
  }

  async function handleSubmit() {
    formError = '';
    formSubmitting = true;

    const payload = {
      nome: formNome,
      preco: Number(formPreco),
      categoria: formCategoria,
      resumo: formResumo,
      descricao: formDescricao,
      imagem: formImagem.trim() !== '' ? formImagem.trim() : null
    };

    try {
      if (isEditing && formId !== null) {
        const res = await api.put(`/cardapio/${formId}`, payload);
        const body = res.data as ApiResponse<MenuItem>;
        if (body.success && body.data) {
          items = items.map((i) => (i.id === formId ? body.data : i));
          modalFormOpen = false;
          if (selectedItem?.id === formId) {
            selectedItem = body.data;
          }
          await buscarCardapio();
        } else {
          formError = body.message || 'Erro ao atualizar item.';
        }
      } else {
        const res = await api.post('/cardapio', payload);
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
      const res = await api.get('/cardapio');
      const body = res.data as ApiResponse<MenuItem[]>;
      if (body?.success) {
        items = body.data ?? [];
      } else if (Array.isArray(res.data)) {
        items = res.data;
      } else {
        error = body?.message || 'Erro ao carregar o cardápio.';
      }
    } catch (e: any) {
      const body = e.response?.data as ApiResponse<MenuItem[]> | undefined;
      error = body?.message || 'Erro ao carregar cardápio.';
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
  input::placeholder {
    color: #C47B54;
    opacity: 1;
  }
</style>

<Menu />

<main class="mx-auto md:pt-40 text-neutral-100">
  <div class="mx-auto">
    {#if loading}
      <div class="my-8 text-center text-neutral-400 font-medium uppercase tracking-widest animate-pulse">
        Carregando cardápio...
      </div>
    {:else if error}
      <div class="my-8 text-center text-red-500 font-semibold text-sm tracking-wide max-w-xl mx-auto bg-red-950/10 p-3 border border-red-900/35">
        {error}
      </div>
    {:else}
      <!-- Menu de Categorias Exclusivo em Hambúrguer (Responsivo) -->
      <div class="w-[98%] mx-auto mb-4 bg-tertiary-200/40 border border-primary-400/40 p-3 relative">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-amber-500">
            Categoria: <strong class="text-primary-900">{categoriaSelecionada || 'Todas'}</strong>
          </span>
          <button
            type="button"
            class="p-2 bg-primary-350 border border-primary-500 text-primary-900 hover:text-amber-600 flex items-center gap-2 cursor-pointer"
            on:click={() => (mobileMenuOpen = !mobileMenuOpen)}
          >
            <span class="text-xs font-bold uppercase">Menu Categorias</span>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {#if mobileMenuOpen}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              {:else}
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
              {/if}
            </svg>
          </button>
        </div>

        {#if mobileMenuOpen}
          <div class="absolute top-full left-0 w-full mt-1 bg-tertiary-200 border border-primary-400/60 shadow-2xl z-50 flex flex-col p-2 gap-1.5 backdrop-blur-xl">
            <button
              type="button"
              class={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer border ${!categoriaSelecionada ? 'bg-amber-600 text-neutral-950 border-amber-600' : 'bg-primary-350 text-primary-900 border-primary-500 hover:border-amber-600'}`}
              on:click={() => { categoriaSelecionada = ''; mobileMenuOpen = false; }}
            >
              Todas as Categorias
            </button>

            {#each categoriasList as cat}
              <button
                type="button"
                class={`px-4 py-3 text-xs font-bold uppercase tracking-wider text-left transition-all cursor-pointer border ${categoriaSelecionada === cat ? 'bg-amber-600 text-neutral-950 border-amber-600' : 'bg-primary-350 text-primary-900 border-primary-500 hover:border-amber-600'}`}
                on:click={() => { categoriaSelecionada = cat; mobileMenuOpen = false; }}
              >
                {cat}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Topo: Campo de Pesquisa e Botão Novo Item -->
      <div class="w-[98%] mx-auto py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Pesquisar no Cardápio"
          style="padding: 12px; width: 300px; display: flex;"
          class="bg-tertiary-100 border border-black rounded-none text-neutral-900 text-sm tracking-wide focus:outline-none focus:border-amber-600 focus:ring-0"
          bind:value={filtro}
        />

        {#if isAdmin}
          <button
            type="button"
            class="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-neutral-950 font-bold px-5 py-3 rounded-none uppercase tracking-wider text-xs transition-colors duration-300 border border-black cursor-pointer"
            on:click={openAddModal}
          >
            <PlusOutline class="w-5 h-5 text-neutral-950" />
            Adicionar Item
          </button>
        {/if}
      </div>

      <!-- Grid do Cardápio -->
      <div class="w-[98%] mx-auto pb-12">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
          {#each items as item}
            <div 
              class="w-full max-w-none p-0 overflow-hidden shadow-2xl border bg-primary-350/80 backdrop-blur-lg border-primary-400 rounded-none flex flex-col justify-between cursor-pointer hover:border-amber-600 transition-all duration-200 group"
              on:click={() => openDetailsModal(item)}
              on:keydown={(e) => e.key === 'Enter' && openDetailsModal(item)}
              role="button"
              tabindex="0"
            >
              <div>
                <div class="relative w-full h-44 bg-tertiary-200/40 border-b border-primary-400/50 overflow-hidden flex items-center justify-center">
                  {#if item.imagem}
                    <img src={item.imagem} alt={item.nome} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  {:else}
                    <div class="text-primary-900/40 font-mono text-xs uppercase tracking-widest">
                      Sem Imagem
                    </div>
                  {/if}

                  {#if item.categoria}
                    <Badge class="absolute top-2 left-2 bg-neutral-950 text-amber-500 border border-neutral-800/60 rounded-none text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                      {item.categoria}
                    </Badge>
                  {/if}
                </div>

                <div class="px-5 pt-4 pb-2 flex items-start justify-between bg-tertiary-200/60 border-b border-primary-400/30">
                  <h3 class="text-lg font-bold text-primary-700 text-left leading-tight group-hover:text-amber-500 transition-colors">
                    {item.nome}
                  </h3>

                  {#if isAdmin}
                    <div class="flex gap-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        class="p-1.5 rounded-none border border-primary-500 hover:border-amber-600 hover:bg-amber-600 group/btn transition-all duration-300"
                        title="Editar Item"
                        on:click|stopPropagation={() => openEditModal(item)}
                      >
                        <EditOutline class="w-4 h-4 text-primary-900 group-hover/btn:text-neutral-950" />
                      </button>
                      <button
                        type="button"
                        title="Remover Item"
                        class="p-1.5 rounded-none border border-primary-500 hover:border-red-500 hover:bg-red-600 group/btn transition-all duration-300"
                        on:click|stopPropagation={() => openConfirm(item.id)}
                        disabled={deletingId === item.id || loading}
                      >
                        <TrashBinOutline class="w-4 h-4 text-red-400 group-hover/btn:text-white" />
                      </button>
                    </div>
                  {/if}
                </div>

                <div class="px-5 py-3 text-left">
                  <!-- Aumentado para line-clamp-3 para caber um texto maior e mais descritivo -->
                  <p class="text-primary-950 text-xs font-medium leading-relaxed line-clamp-3">
                    {item.resumo}
                  </p>
                </div>
              </div>

              <div class="px-5 pb-4 pt-2 flex justify-end items-center mt-auto">
                <span class="text-xl font-black text-amber-500 tracking-tight">
                  {formatarPreco(item.preco)}
                </span>
              </div>
            </div>
          {/each}
        </div>
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
        <span class="text-2xl font-black text-amber-500">
          {formatarPreco(selectedItem.preco)}
        </span>
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
<Modal bind:open={modalFormOpen} title={isEditing ? 'Editar Item do Cardápio' : 'Adicionar Novo Item'} size="md" autoclose={false} class="bg-neutral-950/90 border border-neutral-800" headerClass="text-amber-500 font-bold border-b border-neutral-700">
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    {#if formError}
      <div class="p-3 bg-red-900/30 border border-red-500 text-red-400 text-xs rounded">
        {formError}
      </div>
    {/if}

    <div>
      <Label for="nome" class="text-xs font-bold uppercase tracking-wide text-amber-500">Nome do Item *</Label>
      <Input id="nome" type="text" placeholder="Ex: Coxinha" bind:value={formNome} required />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label for="preco" class="text-xs font-bold uppercase tracking-wide text-amber-500">Preço (R$) *</Label>
        <Input id="preco" type="number" step="0.01" min="0" placeholder="45.00" bind:value={formPreco} required />
      </div>
      <div>
        <Label for="categoria" class="text-xs font-bold uppercase tracking-wide text-amber-500">Categoria *</Label>
        <select 
          id="categoria" 
          bind:value={formCategoria} 
          class="w-full bg-tertiary-100 border border-black text-neutral-900 text-sm p-2.5 rounded-none focus:outline-none focus:border-amber-600"
          required
        >
          {#each categoriasList as cat}
            <option value={cat}>{cat}</option>
          {/each}
        </select>
      </div>
    </div>

    <div>
      <Label for="resumo" class="text-xs font-bold uppercase tracking-wide text-amber-500">Resumo *</Label>
      <Input id="resumo" type="text" placeholder="Descrição um pouco mais detalhada do item..." bind:value={formResumo} required />
    </div>

    <div>
      <Label for="descricao" class="text-xs font-bold uppercase tracking-wide text-amber-500">Descrição Completa *</Label>
      <Textarea id="descricao" rows="3" placeholder="Detalhes dos ingredientes, preparo, etc." bind:value={formDescricao} required />
    </div>

    <div>
      <Label for="imagem" class="text-xs font-bold uppercase tracking-wide text-amber-500">URL da Imagem (Opcional)</Label>
      <Input id="imagem" type="url" placeholder="https://exemplo.com/imagem.jpg" bind:value={formImagem} />
    </div>

    <div class="flex justify-end gap-3 pt-4 border-t border-neutral-800">
      <button
        type="button"
        class="bg-neutral-700 hover:bg-neutral-600 text-neutral-100 font-bold px-4 py-2 text-xs uppercase tracking-wider transition-colors duration-200 border border-black cursor-pointer"
        on:click={() => (modalFormOpen = false)}
      >
        Cancelar
      </button>

      <button
        type="submit"
        class="bg-amber-600 hover:bg-amber-700 text-neutral-950 font-bold px-4 py-2 text-xs uppercase tracking-wider transition-colors duration-200 border border-black cursor-pointer disabled:opacity-50"
        disabled={formSubmitting}
      >
        {formSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Cadastrar'}
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