<script lang="ts">
  import { Card, Badge, Modal, Label, Input, Textarea, Button } from 'flowbite-svelte';
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
  let loading = true;
  let error = '';
  let deletingId: number | null = null;
  let confirmOpen = false;
  let confirmTargetId: number | null = null;
  let filtro = '';
  let currentUser: UserAuth | null = null;

  // Estado do Modal de Cadastro / Edição
  let modalFormOpen = false;
  let isEditing = false;
  let formId: number | null = null;
  let formNome = '';
  let formPreco: number | string = '';
  let formCategoria = '';
  let formResumo = '';
  let formDescricao = '';
  let formImagem = '';
  let formError = '';
  let formSubmitting = false;

  $: isAdmin = currentUser?.role === 'admin';

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
    } catch (e: any) {
      console.error('Erro ao deletar item do cardápio:', e);
      const body = e.response?.data as ApiResponse<null> | undefined;
      error = body?.message || 'Erro ao remover item do cardápio.';
    } finally {
      deletingId = null;
    }
  }

  // Abrir modal para NOVO ITEM
  function openAddModal() {
    isEditing = false;
    formId = null;
    formNome = '';
    formPreco = '';
    formCategoria = '';
    formResumo = '';
    formDescricao = '';
    formImagem = '';
    formError = '';
    modalFormOpen = true;
  }

  // Abrir modal para EDITAR ITEM
  function openEditModal(item: MenuItem) {
    isEditing = true;
    formId = item.id;
    formNome = item.nome;
    formPreco = item.preco;
    formCategoria = item.categoria;
    formResumo = item.resumo;
    formDescricao = item.descricao;
    formImagem = item.imagem || '';
    formError = '';
    modalFormOpen = true;
  }

  // Salvar (Criar ou Atualizar)
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
        } else {
          formError = body.message || 'Erro ao atualizar item.';
        }
      } else {
        const res = await api.post('/cardapio', payload);
        const body = res.data as ApiResponse<MenuItem>;
        if (body.success && body.data) {
          items = [body.data, ...items];
          modalFormOpen = false;
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
    try {
      try {
        const userRes = await api.get('/users/me');
        if (userRes.data?.success) {
          currentUser = userRes.data.data;
        }
      } catch (err) {
        console.warn('Usuário não autenticado ou falha ao buscar perfil:', err);
      }

      const res = await api.get('/cardapio');
      const body = res.data as ApiResponse<MenuItem[]>;
      if (body.success) {
        items = body.data ?? [];
      } else {
        error = body.message;
      }
    } catch (e: any) {
      console.error('Erro ao carregar cardápio:', e);
      const body = e.response?.data as ApiResponse<MenuItem[]> | undefined;
      error = body?.message || 'Erro ao carregar cardápio.';
    } finally {
      loading = false;
    }
  });

  $: filtro, buscarCardapio();

  async function buscarCardapio() {
    try {
      if (filtro.trim() !== '') {
        const res = await api.get(`/cardapio/busca/${encodeURIComponent(filtro.trim())}`);
        items = res.data.data ?? [];
      } else {
        const res = await api.get('/cardapio');
        items = res.data.data ?? [];
      }
    } catch (e: any) {
      console.error('Erro ao buscar no cardápio:', e);
    }
  }

  function formatarPreco(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor));
  }
</script>

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
      <!-- Topo: Campo de Pesquisa e Botão Novo Item (Admin) -->
      <div class="w-[98%] mx-auto py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Pesquisar no Cardápio"
          style="padding: 12px; width: 300px; display: flex;"
          class="bg-tertiary-100 border border-black rounded-none text-neutral-900 text-sm tracking-wide focus:outline-none focus:border-amber-600 focus:ring-0"
          bind:value={filtro}
        />

        {#if isAdmin}
          <button
            class="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-neutral-950 font-bold px-5 py-3 rounded-none uppercase tracking-wider text-xs transition-colors duration-300 border border-black"
            on:click={openAddModal}
          >
            <PlusOutline class="w-5 h-5 text-neutral-950" />
            Adicionar Item
          </button>
        {/if}
      </div>

      <style>
        input::placeholder {
          color: #C47B54;
          opacity: 1;
        }
      </style>

      <!-- Lista / Grid do Cardápio -->
      <div class="w-[98%] mx-auto pb-12">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
          {#each items as item}
            <Card class="w-full max-w-none p-0 overflow-hidden shadow-2xl border bg-primary-350/80 backdrop-blur-lg border-primary-400 rounded-none flex flex-col justify-between">
              <div>
                <!-- Imagem Pequena / Destaque no Topo -->
                <div class="relative w-full h-40 bg-tertiary-200/40 border-b border-primary-400/50 overflow-hidden flex items-center justify-center">
                  {#if item.imagem}
                    <img src={item.imagem} alt={item.nome} class="w-full h-full object-cover" />
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

                <!-- Nome do Item & Botões de Ação Admin -->
                <div class="px-5 pt-4 pb-2 flex items-start justify-between bg-tertiary-200/60 border-b border-primary-400/30">
                  <h3 class="text-lg font-bold text-primary-700 text-left leading-tight">
                    {item.nome}
                  </h3>

                  {#if isAdmin}
                    <div class="flex gap-1.5 shrink-0 ml-2">
                      <button
                        class="p-1.5 rounded-none border border-primary-500 hover:border-amber-600 hover:bg-amber-600 group transition-all duration-300"
                        title="Editar Item"
                        on:click={() => openEditModal(item)}
                      >
                        <EditOutline class="w-4 h-4 text-primary-900 group-hover:text-neutral-950" />
                      </button>
                      <button
                        title="Remover Item"
                        class="p-1.5 rounded-none border border-primary-500 hover:border-red-500 hover:bg-red-600 group transition-all duration-300"
                        on:click={() => openConfirm(item.id)}
                        disabled={deletingId === item.id || loading}
                      >
                        <TrashBinOutline class="w-4 h-4 text-red-400 group-hover:text-white" />
                      </button>
                    </div>
                  {/if}
                </div>

                <!-- Resumo do Item -->
                <div class="px-5 py-3 text-left">
                  <p class="text-primary-950 text-xs font-medium leading-relaxed">
                    {item.resumo}
                  </p>
                </div>
              </div>

              <!-- Canto Inferior Direito: Preço -->
              <div class="px-5 pb-4 pt-2 flex justify-end items-center mt-auto">
                <span class="text-xl font-black text-amber-500 tracking-tight">
                  {formatarPreco(item.preco)}
                </span>
              </div>
            </Card>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</main>

<!-- Modal de Adicionar / Editar Item -->
<Modal bind:open={modalFormOpen} title={isEditing ? 'Editar Item do Cardápio' : 'Adicionar Novo Item'} size="md" autoclose={false} class="bg-neutral-950/50" headerClass="text-amber-500 font-bold border-b border-neutral-700">
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    {#if formError}
      <div class="p-3 bg-red-900/30 border border-red-500 text-red-400 text-xs rounded">
        {formError}
      </div>
    {/if}

    <div>
      <Label for="nome" class="text-xs font-bold uppercase tracking-wide text-tertiary-500">Nome do Item *</Label>
      <Input id="nome" type="text" placeholder="Ex: Pizza Margherita" bind:value={formNome} required />
    </div>

    <div class="grid grid-cols-2 gap-4 ">
      <div>
        <Label for="preco" class="text-xs font-bold uppercase tracking-wide text-tertiary-500">Preço (R$) *</Label>
        <Input id="preco" type="number" step="0.01" min="0" placeholder="45.00" bind:value={formPreco} required />
      </div>
      <div>
        <Label for="categoria" class="text-xs font-bold uppercase tracking-wide text-tertiary-500">Categoria *</Label>
        <Input id="categoria" type="text" placeholder="Ex: Pizzas, Bebidas" bind:value={formCategoria} required />
      </div>
    </div>

    <div>
      <Label for="resumo" class="text-xs font-bold uppercase tracking-wide text-tertiary-500">Resumo *</Label>
      <Input id="resumo" type="text" placeholder="Breve descrição em poucas palavras" bind:value={formResumo} required />
    </div>

    <div>
      <Label for="descricao" class="text-xs font-bold uppercase tracking-wide text-tertiary-500">Descrição Completa *</Label>
      <Textarea id="descricao" rows="3" placeholder="Detalhes dos ingredientes, preparo, etc." bind:value={formDescricao} required />
    </div>

    <div>
      <Label for="imagem" class="text-xs font-bold uppercase tracking-wide text-tertiary-500">URL da Imagem (Opcional)</Label>
      <Input id="imagem" type="url" placeholder="https://exemplo.com/imagem.jpg" bind:value={formImagem} />
    </div>

    <div class="flex justify-end gap-3 pt-4 border-t border-primary-400/30">
      <button
        type="button"
        class="bg-tertiary-400 hover:bg-tertiary-500 text-neutral-950 font-bold px-4 py-2 text-xs uppercase tracking-wider transition-colors duration-200 border border-black"
        on:click={() => (modalFormOpen = false)}
      >
        Cancelar
      </button>
    
      <button
        type="submit"
        class="bg-amber-600 hover:bg-amber-700 text-neutral-950 font-bold px-4 py-2 text-xs uppercase tracking-wider transition-colors duration-200 border border-black disabled:opacity-50"
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