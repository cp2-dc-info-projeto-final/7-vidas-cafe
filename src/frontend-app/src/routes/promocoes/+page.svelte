<script lang="ts">
  import { Badge, Modal, Label, Input } from 'flowbite-svelte';
  import ConfirmModal from '../../components/ConfirmModal.svelte';
  import { EditOutline, TrashBinOutline, ClockOutline } from 'flowbite-svelte-icons';
  import api from '$lib/api';
  import type { ApiResponse } from '$lib/api';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition'; // <--- Importado para a transição
  import Menu from '../../components/Menu.svelte';
  import { getCurrentUser2 } from '$lib/auth';

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

  let items: MenuItem[] = [];
  
  // Categorias fixas estritas
  const categoriasList = ['Bebidas', 'Doces', 'Salgados'];
  let categoriaSelecionada = '';

  let loading = true;
  let error = '';
  let cancelandoId: number | null = null;
  let confirmOpen = false;
  let confirmTargetId: number | null = null;
  let currentUser: any = null;

  // Estado do Modal de Gerenciamento/Edição de Promoção
  let modalPromoOpen = false;
  let itemSelecionadoPromo: MenuItem | null = null;
  let novaPromocao = 10;
  let dataInicio = '';
  let dataFim = '';
  let salvandoPromo = false;

  // Estado do Modal de Sucesso
  let sucessoModalOpen = false;

  // Reatividade para verificação de Admin
  $: isAdmin = currentUser?.role?.toLowerCase() === 'admin' || 
               (currentUser as any)?.type?.toLowerCase() === 'admin';

  // Função para verificar se a promoção está ativa no momento atual
  function isPromocaoAtiva(item: MenuItem): boolean {
    if (!item.promocao) return false;
    const agora = new Date().getTime();
    const inicio = item.iniciopromocao ? new Date(item.iniciopromocao).getTime() : null;
    const fim = item.fimpromocao ? new Date(item.fimpromocao).getTime() : null;

    const inicioValid = !inicio || agora >= inicio;
    const fimValid = !fim || agora <= fim;
    return inicioValid && fimValid;
  }

  // Função para verificar se a promoção está agendada para o futuro
  function isPromocaoAgendada(item: MenuItem): boolean {
    if (!item.promocao) return false;
    const agora = new Date().getTime();
    const inicio = item.iniciopromocao ? new Date(item.iniciopromocao).getTime() : null;
    
    return inicio !== null && agora < inicio;
  }

  function calcularPrecoFinal(item: MenuItem): number {
    if (isPromocaoAtiva(item) && item.promocao) {
      return Number(item.preco) * (1 - item.promocao / 100);
    }
    return Number(item.preco);
  }

  function openConfirmCancel(id: number) {
    confirmTargetId = id;
    confirmOpen = true;
  }

  function closeConfirm() {
    confirmOpen = false;
    confirmTargetId = null;
    cancelandoId = null;
  }

  function handleConfirmCancel() {
    if (confirmTargetId !== null) {
      cancelarPromocaoItem(confirmTargetId);
    }
    closeConfirm();
  }

  function handleCancel() {
    closeConfirm();
  }

  async function cancelarPromocaoItem(id: number) {
    cancelandoId = id;
    error = '';
    try {
      const res = await api.delete(`/cardapio/${id}/promocao`);
      if (res.data.success || res.status === 200) {
        items = items.filter((item) => item.id !== id);
      }
    } catch (e: any) {
      console.error('Erro ao cancelar promoção:', e);
      const body = e.response?.data as ApiResponse<null> | undefined;
      error = body?.message || 'Erro ao cancelar promoção do item.';
    } finally {
      cancelandoId = null;
    }
  }

  function formatarDataLocal(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    const horas = String(date.getHours()).padStart(2, '0');
    const minutos = String(date.getMinutes()).padStart(2, '0');
    return `${ano}-${mes}-${dia}T${horas}:${minutos}`;
  }

  function formatarDataExibicao(isoString: string): string {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function openEditPromoModal(item: MenuItem) {
    itemSelecionadoPromo = item;
    novaPromocao = item.promocao || 10;
    dataInicio = item.iniciopromocao ? formatarDataLocal(item.iniciopromocao) : '';
    dataFim = item.fimpromocao ? formatarDataLocal(item.fimpromocao) : '';
    modalPromoOpen = true;
  }

  async function salvarPromocao() {
    if (!itemSelecionadoPromo) return;
    salvandoPromo = true;

    try {
      const res = await api.put(`/cardapio/${itemSelecionadoPromo.id}/promocao`, {
        promocao: Number(novaPromocao),
        iniciopromocao: dataInicio || null,
        fimpromocao: dataFim || null
      });

      if (res.data.success || res.status === 200) {
        modalPromoOpen = false;
        await carregarPromocoes();
        sucessoModalOpen = true; // <--- Abre o modal de sucesso no lugar do alert
      }
    } catch (e: any) {
      console.error('Erro ao salvar promoção:', e);
      alert(e.response?.data?.message || 'Erro ao atualizar promoção.');
    } finally {
      salvandoPromo = false;
    }
  }

  onMount(async () => {
    loading = true;
    try {
      currentUser = await getCurrentUser2();
    } catch (err) {
      currentUser = null;
    }

    await carregarPromocoes();
    loading = false;
  });

  $: categoriaSelecionada, carregarPromocoes();

  async function carregarPromocoes() {
    try {
      const res = await api.get('/cardapio');
      let dados = res.data.data ?? res.data ?? [];

      dados = dados.filter((i: MenuItem) => i.promocao && Number(i.promocao) > 0);

      if (!isAdmin) {
        dados = dados.filter((i: MenuItem) => isPromocaoAtiva(i));
      }

      if (categoriaSelecionada && categoriaSelecionada.trim() !== '') {
        dados = dados.filter((i: MenuItem) => i.categoria?.toLowerCase() === categoriaSelecionada.toLowerCase());
      }

      items = dados;
    } catch (e: any) {
      console.error('Erro ao buscar promoções:', e);
      error = 'Erro ao carregar itens em promoção.';
    }
  }

  function formatarPreco(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor));
  }
</script>

<style>
  input::placeholder {
    color: #8A5219;
    opacity: 0.8;
  }
</style>

<Menu />

<main class="mx-auto pt-36 md:pt-48 text-primary-50">
  <div class="mx-auto">
    
    <div class="max-w-7xl mx-auto px-4 mb-6 text-center">
      <h1 class="text-3xl md:text-4xl font-black uppercase tracking-wider text-tertiary-300 font-serif">
          Ofertas e Promoções Especiais
      </h1>
      <p class="text-xs text-primary-200 mt-2">Aproveite os descontos imperdíveis do nosso cardápio!</p>
    </div>

    {#if loading}
      <div class="my-8 text-center text-neutral-400 font-medium uppercase tracking-widest animate-pulse">
        Carregando promoções...
      </div>
    {:else if error}
      <div class="my-8 text-center text-red-500 font-semibold text-sm tracking-wide max-w-xl mx-auto bg-red-950/10 p-3 border border-red-900/35">
        {error}
      </div>
    {:else}
      <div class="hidden xl:block max-w-7xl bg-tertiary-200/40 border border-primary-400/40 p-3 mb-6 mx-auto">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-bold uppercase tracking-wider text-tertiary-400 mr-2 flex items-center gap-1">
            Categorias:
         </span>
         <button
           type="button"
           class={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${!categoriaSelecionada ? 'bg-tertiary-500 text-primary-950 border-tertiary-500' : 'bg-primary-350 text-primary-900 border-primary-500 hover:border-tertiary-400'}`}
           on:click={() => { categoriaSelecionada = ''; }}
         >
           Todas
         </button>

         {#each categoriasList as cat}
           <button
             type="button"
             class={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${categoriaSelecionada === cat ? 'bg-tertiary-500 text-primary-950 border-tertiary-500' : 'bg-primary-350 text-primary-900 border-primary-500 hover:border-tertiary-400'}`}
             on:click={() => { categoriaSelecionada = cat; }}
           >
             {cat}
           </button>
         {/each}
        </div>
      </div>

      <div class="block xl:hidden w-full bg-tertiary-200/40 border-y border-primary-400/40 py-2.5 px-3 mb-6">
        <span class="text-xs font-bold uppercase tracking-wider text-tertiary-900 mr-2 flex items-center gap-1">
          Categorias:
       </span> 
        <div class="flex items-center gap-2 overflow-x-auto scrollbar-none no-scrollbar whitespace-nowrap -mx-3 px-3">
          <button
            type="button"
            class={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer rounded-full shrink-0 border ${
              !categoriaSelecionada ? 'bg-tertiary-500 text-primary-950 border-tertiary-500 shadow-sm' : 'bg-primary-350 text-primary-900 border-primary-500/60 hover:border-tertiary-400'
            }`}
            on:click={() => { categoriaSelecionada = ''; }}
          >
            Todas
          </button>
      
          {#each categoriasList as cat}
            <button
              type="button"
              class={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer rounded-full shrink-0 border ${
                categoriaSelecionada === cat ? 'bg-tertiary-500 text-primary-950 border-tertiary-500 shadow-sm' : 'bg-primary-350 text-primary-900 border-primary-500/60 hover:border-tertiary-400'
              }`}
              on:click={() => { categoriaSelecionada = cat; }}
            >
              {cat}
            </button>
          {/each}
        </div>
      </div>

      {#if items.length === 0}
        <div class="text-center py-16 text-primary-300 text-xs tracking-wider uppercase font-medium space-y-4">
          <p>Nenhuma promoção encontrada no momento.</p>
        </div>
      {:else}
        <div class="hidden xl:block max-w-7xl mx-auto px-4">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
            {#each items as item}
              {@const agendada = isPromocaoAgendada(item)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class={`w-full max-w-none p-0 overflow-hidden shadow-2xl bg-primary-800 rounded-3xl flex flex-col justify-between cursor-pointer transition-all duration-300 group relative border-2 ${
                  agendada 
                    ? 'border-blue-500/60 opacity-90 hover:border-blue-400' 
                    : 'border-tertiary-600/70 hover:border-tertiary-400'
                } hover:scale-[1.02]`}
                on:click={() => window.location.href = `/Cardapio/${item.id}`}
              >
                <div>
                  <div class="relative w-full h-48 bg-primary-900/60 border-b-2 border-tertiary-600/50 overflow-hidden flex items-center justify-center rounded-t-3xl">
                    {#if item.imagem}
                      <img src={item.imagem} alt={item.nome} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {:else}
                      <div class="text-tertiary-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                        <span>Sem Imagem</span>
                      </div>
                    {/if}

                    {#if item.categoria}
                      <Badge class="absolute top-3 left-3 bg-tertiary-600 text-primary-50 border border-tertiary-400 rounded-full text-[10px] font-bold uppercase tracking-widest px-3 py-1 shadow-md">
                         {item.categoria}
                      </Badge>
                    {/if}

                    {#if agendada}
                      <Badge class="absolute top-3 right-3 bg-blue-600 text-white border border-blue-400 rounded-full text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 shadow-lg flex items-center gap-1">
                        <ClockOutline class="w-3 h-3" /> Agendada (-{item.promocao}%)
                      </Badge>
                    {:else}
                      <Badge class="absolute top-3 right-3 bg-red-600 text-white border border-red-400 rounded-full text-[10px] font-black uppercase tracking-widest px-2.5 py-1 shadow-lg animate-pulse">
                        🔥 -{item.promocao}%
                      </Badge>
                    {/if}
                  </div>

                  <div class="px-5 pt-4 pb-2 flex items-start justify-between">
                    <h3 class="text-lg font-black text-primary-50 text-left leading-tight group-hover:text-tertiary-300 transition-colors">
                      {item.nome}
                    </h3>

                    {#if isAdmin}
                      <div class="flex gap-1.5 shrink-0 ml-2">
                        <button
                          type="button"
                          class="p-2 rounded-full bg-primary-700 border border-primary-600 hover:bg-tertiary-500 hover:text-primary-950 text-tertiary-200 transition-all duration-200 shadow-sm z-10"
                          title="Editar Promoção"
                          on:click|stopPropagation={() => openEditPromoModal(item)}
                        >
                          <EditOutline class="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Cancelar Promoção"
                          class="p-2 rounded-full bg-primary-700 border border-primary-600 hover:bg-red-600 hover:text-white text-red-300 transition-all duration-200 shadow-sm z-10"
                          on:click|stopPropagation={() => openConfirmCancel(item.id)}
                          disabled={cancelandoId === item.id || loading}
                        >
                          <TrashBinOutline class="w-4 h-4" />
                        </button>
                      </div>
                    {/if}
                  </div>

                  <div class="px-5 py-2 text-left space-y-1">
                    <p class="text-primary-200 text-xs font-medium leading-relaxed line-clamp-2">
                      {item.resumo}
                    </p>
                    {#if agendada && item.iniciopromocao}
                      <p class="text-[11px] text-blue-300 font-semibold flex items-center gap-1">
                        <span>Inicia em: {formatarDataExibicao(item.iniciopromocao)}</span>
                      </p>
                    {/if}
                    {#if item.fimpromocao}
                      <p class="text-[11px] text-amber-300/90 font-semibold flex items-center gap-1">
                        <span>Termina em: {formatarDataExibicao(item.fimpromocao)}</span>
                      </p>
                    {/if}
                  </div>
                </div>

                <div class="px-5 pb-4 pt-3 flex justify-between items-center mt-auto border-t border-primary-700/80 mx-3">
                  <span class="text-xs text-primary-300 font-bold uppercase tracking-wider">Valor</span>
                  <div class="text-right">
                    {#if agendada}
                      <span class="block text-[10px] text-blue-300 font-medium">Preço Normal</span>
                      <span class="text-lg font-black text-primary-50 bg-primary-900 px-3.5 py-1 rounded-2xl border border-primary-700 shadow-md inline-block">
                        {formatarPreco(item.preco)}
                      </span>
                    {:else}
                      <span class="block text-[10px] text-gray-400 line-through">
                        {formatarPreco(item.preco)}
                      </span>
                      <span class="text-lg font-black text-primary-950 bg-tertiary-400 px-3.5 py-1 rounded-2xl border border-tertiary-300 shadow-md inline-block">
                        {formatarPreco(calcularPrecoFinal(item))}
                      </span>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
        
        <div class="block xl:hidden px-2">
          <div class="grid grid-cols-2 gap-3 w-full">
            {#each items as item}
              {@const agendada = isPromocaoAgendada(item)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div
                class={`w-full max-w-none p-0 overflow-hidden shadow-xl bg-primary-800 rounded-2xl flex flex-col justify-between cursor-pointer transition-all duration-300 group relative border-2 ${
                  agendada 
                    ? 'border-blue-500/60 opacity-90 hover:border-blue-400' 
                    : 'border-tertiary-600/70 hover:border-tertiary-400'
                } hover:scale-[1.02]`}
                on:click={() => window.location.href = `/Cardapio/${item.id}`}
              >
                <div>
                  <div class="relative w-full h-32 bg-primary-900/60 border-b-2 border-tertiary-600/50 overflow-hidden flex items-center justify-center rounded-t-2xl">
                    {#if item.imagem}
                      <img src={item.imagem} alt={item.nome} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {:else}
                      <div class="text-tertiary-300 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <span>Sem Imagem</span>
                      </div>
                    {/if}
         
                    {#if item.categoria}
                      <Badge class="absolute top-2 left-2 bg-tertiary-600 text-primary-50 border border-tertiary-400 rounded-full text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 shadow-md">
                        {item.categoria}
                      </Badge>
                    {/if}

                    {#if agendada}
                      <Badge class="absolute top-2 right-2 bg-blue-600 text-white border border-blue-400 rounded-full text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 shadow-md">
                        Agendada
                      </Badge>
                    {:else}
                      <Badge class="absolute top-2 right-2 bg-red-600 text-white border border-red-400 rounded-full text-[9px] font-black uppercase tracking-widest px-2 py-0.5 shadow-md">
                        -{item.promocao}%
                      </Badge>
                    {/if}
                  </div>
         
                  <div class="px-3 pt-3 pb-1 flex items-start justify-between">
                    <h3 class="text-sm md:text-base font-black text-primary-50 text-left leading-tight group-hover:text-tertiary-300 transition-colors line-clamp-2">
                      {item.nome}
                    </h3>
         
                    {#if isAdmin}
                      <div class="flex gap-1 shrink-0 ml-1">
                        <button
                          type="button"
                          class="p-1.5 rounded-full bg-primary-700 border border-primary-600 hover:bg-tertiary-500 hover:text-primary-950 text-tertiary-200 transition-all duration-200 shadow-sm z-10"
                          title="Editar Promoção"
                          on:click|stopPropagation={() => openEditPromoModal(item)}
                        >
                          <EditOutline class="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Cancelar Promoção"
                          class="p-1.5 rounded-full bg-primary-700 border border-primary-600 hover:bg-red-600 hover:text-white text-red-300 transition-all duration-200 shadow-sm z-10"
                          on:click|stopPropagation={() => openConfirmCancel(item.id)}
                          disabled={cancelandoId === item.id || loading}
                        >
                          <TrashBinOutline class="w-3.5 h-3.5" />
                        </button>
                      </div>
                    {/if}
                  </div>
         
                  <div class="px-3 py-1 text-left space-y-0.5">
                    <p class="text-primary-200 text-[11px] font-medium leading-relaxed line-clamp-2">
                      {item.resumo}
                    </p>
                    {#if agendada && item.iniciopromocao}
                      <p class="text-[10px] text-blue-300 font-semibold">
                        Inicia: {formatarDataExibicao(item.iniciopromocao)}
                      </p>
                    {/if}
                    {#if item.fimpromocao}
                      <p class="text-[10px] text-amber-300/90 font-semibold">
                        Termina: {formatarDataExibicao(item.fimpromocao)}
                      </p>
                    {/if}
                  </div>
                </div>
         
                <div class="px-3 pb-3 pt-2 flex justify-between items-center mt-auto border-t border-primary-700/80 mx-2">
                  <span class="text-[10px] text-primary-300 font-bold uppercase tracking-wider">Valor</span>
                  <div class="text-right">
                    {#if agendada}
                      <span class="block text-[9px] text-blue-300">Normal</span>
                      <span class="text-xs md:text-sm font-black text-primary-50 bg-primary-900 px-2 py-0.5 rounded-xl border border-primary-700 shadow-md inline-block">
                        {formatarPreco(item.preco)}
                      </span>
                    {:else}
                      <span class="block text-[9px] text-gray-400 line-through">
                        {formatarPreco(item.preco)}
                      </span>
                      <span class="text-sm md:text-base font-black text-primary-950 bg-tertiary-400 px-2.5 py-0.5 rounded-xl border border-tertiary-300 shadow-md inline-block">
                        {formatarPreco(calcularPrecoFinal(item))}
                      </span>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</main>

<!-- Modal de Edição de Promoção (Admin) -->
<Modal 
  bind:open={modalPromoOpen} 
  title={`🏷️ Gerenciar Promoção: ${itemSelecionadoPromo?.nome || ''}`} 
  size="md" 
  autoclose={false} 
  class="bg-primary-900/95 border-2 border-tertiary-600/80 shadow-2xl rounded-3xl backdrop-blur-xl" 
  classes={{ header: "text-tertiary-300 font-black text-base uppercase tracking-wider border-b border-tertiary-600/40 pb-3" }}
>
  <div class="space-y-4 pt-2">
    <div>
      <Label for="porcentagem" class="text-[11px] font-bold uppercase tracking-widest text-tertiary-300 mb-1">Porcentagem de Desconto (%) *</Label>
      <Input 
        id="porcentagem" 
        type="number" 
        min="1" 
        max="100" 
        bind:value={novaPromocao} 
        class="bg-primary-950/60 border border-tertiary-600/60 text-primary-50 rounded-xl text-sm p-3 focus:outline-none focus:border-tertiary-400"
      />
    </div>

    <div>
      <Label for="datainicio" class="text-[11px] font-bold uppercase tracking-widest text-tertiary-300 mb-1">Início da Promoção</Label>
      <Input 
        id="datainicio" 
        type="datetime-local" 
        bind:value={dataInicio} 
        class="bg-primary-950/60 border border-tertiary-600/60 text-primary-50 rounded-xl text-sm p-3 focus:outline-none focus:border-tertiary-400"
      />
    </div>

    <div>
      <Label for="datafim" class="text-[11px] font-bold uppercase tracking-widest text-tertiary-300 mb-1">Fim da Promoção</Label>
      <Input 
        id="datafim" 
        type="datetime-local" 
        bind:value={dataFim} 
        class="bg-primary-950/60 border border-tertiary-600/60 text-primary-50 rounded-xl text-sm p-3 focus:outline-none focus:border-tertiary-400"
      />
    </div>

    <div class="flex justify-end gap-3 pt-4 border-t border-tertiary-600/40 mt-6">
      <button
        type="button"
        class="bg-primary-800 hover:bg-primary-700 text-primary-200 font-bold px-5 py-2.5 text-xs uppercase tracking-wider rounded-xl transition-all border border-primary-600 cursor-pointer"
        on:click={() => (modalPromoOpen = false)}
      >
        Fechar
      </button>

      <button
        type="button"
        class="bg-tertiary-500 hover:bg-tertiary-400 text-primary-950 font-black px-6 py-2.5 text-xs uppercase tracking-wider rounded-xl transition-all border border-tertiary-400 shadow-lg cursor-pointer disabled:opacity-50"
        on:click={salvarPromocao}
        disabled={salvandoPromo}
      >
        {salvandoPromo ? 'Salvando...' : 'Salvar Alterações'}
      </button>
    </div>
  </div>
</Modal>

<!-- Modal de Sucesso Customizado -->
{#if sucessoModalOpen}
    <div transition:fade class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-md p-6 flex flex-col items-center gap-4 shadow-2xl text-center">
            
            <div class="w-16 h-16 bg-tertiary-500/20 text-tertiary-400 rounded-full flex items-center justify-center text-3xl mb-1">
                ✓
            </div>

            <h3 class="font-serif font-bold text-tertiary-400 text-xl uppercase tracking-wider">
                Promoção Salva!
            </h3>

            <p class="text-xs text-primary-200 leading-relaxed">
                A promoção do item foi atualizada com sucesso no cardápio.
            </p>

            <button 
                type="button" 
                on:click={() => (sucessoModalOpen = false)}
                class="w-full mt-2 py-3 bg-tertiary-500 hover:bg-tertiary-600 text-primary-950 font-black rounded-xl uppercase tracking-widest transition-all shadow-md cursor-pointer text-xs"
            >
                Entendido
            </button>
        </div>
    </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  message="Tem certeza que deseja cancelar a promoção deste item?"
  confirmText="Sim, Cancelar"
  cancelText="Voltar"
  onConfirm={handleConfirmCancel}
  onCancel={handleCancel}
/>