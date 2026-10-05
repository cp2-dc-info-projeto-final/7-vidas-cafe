<script lang="ts">
    import { Badge } from 'flowbite-svelte';
    import api from '$lib/api';
    import type { ApiResponse } from '$lib/api';
    import { onMount } from 'svelte';
    import Menu from '../../../components/Menu.svelte';
    import { page } from '$app/state';
    import { getToken, getCurrentUser } from '$lib/auth';
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition'; // <--- Importado para o efeito de fade
    
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

    let item: MenuItem | null = null;
    let loading = true;
    let error = '';
    let adicionando = false;
    let mostrarModal = false; 
    let quantidadeSelecionada = 1;

    // Estados para o Admin gerenciar promoção
    let isAdmin = false;
    let mostrarModalPromo = false;
    let novaPromocao = 10;
    let dataInicio = '';
    let dataFim = '';
    let salvandoPromo = false;

    // Estado para o Modal de Sucesso da Promoção
    let mostrarModalSucessoPromo = false;

    function formatarPreco(valor: number): string {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(Number(valor));
    }

    // Função auxiliar para converter UTC do banco para o horário local do input
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

    // Verifica se a promoção está ativa no momento atual (se faltar data, ativa direto)
    $: promocaoAtiva = item && item.promocao != null && item.promocao > 0 && (
        (!item.iniciopromocao && !item.fimpromocao) ||
        ((!item.iniciopromocao || new Date() >= new Date(item.iniciopromocao)) &&
         (!item.fimpromocao || new Date() <= new Date(item.fimpromocao)))
    );

    $: precoFinal = (item && promocaoAtiva && item.promocao) 
        ? item.preco * (1 - item.promocao / 100) 
        : (item?.preco ?? 0);

    function voltar() {
        if (typeof window !== 'undefined') {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/Cardapio';
            }
        }
    }

    function alterarQuantidade(valor: number) {
        const novaQtd = quantidadeSelecionada + valor;
        if (novaQtd >= 1) {
            quantidadeSelecionada = novaQtd;
        }
    }

    async function adicionarAoCarrinho() {
        const token = getToken();
        if (!token) {
            goto('/login');
            return;
        }

        if (!item) return;

        try {
            adicionando = true;
            const res = await api.post('/carrinho/adicionar', {
                cardapio_id: item.id,
                quantidade: quantidadeSelecionada
            });

            if (res.data.success) {
                mostrarModal = true; 
            }
        } catch (e: any) {
            console.error('Erro ao adicionar item:', e);
            alert(e.response?.data?.message || 'Erro ao adicionar item ao carrinho.');
        } finally {
            adicionando = false;
        }
    }

    async function abrirModalPromo() {
        if (item) {
            novaPromocao = item.promocao || 10;
            // Usa formatarDataLocal para exibir o fuso certo no input
            dataInicio = item.iniciopromocao ? formatarDataLocal(item.iniciopromocao) : '';
            dataFim = item.fimpromocao ? formatarDataLocal(item.fimpromocao) : '';
        }
        mostrarModalPromo = true;
    }

    async function salvarPromocao() {
        if (!item) return;
        try {
            salvandoPromo = true;
            const res = await api.put(`/cardapio/${item.id}/promocao`, {
                promocao: Number(novaPromocao),
                iniciopromocao: dataInicio ? new Date(dataInicio).toISOString() : null,
                fimpromocao: dataFim ? new Date(dataFim).toISOString() : null
            });

            if (res.data.success || res.status === 200) {
                item.promocao = Number(novaPromocao);
                item.iniciopromocao = dataInicio ? new Date(dataInicio).toISOString() : null;
                item.fimpromocao = dataFim ? new Date(dataFim).toISOString() : null;
                mostrarModalPromo = false;
                
                // Pequeno atraso para fechar o modal anterior com fluidez e abrir o de sucesso
                setTimeout(() => {
                    mostrarModalSucessoPromo = true;
                }, 150);
            }
        } catch (e: any) {
            console.error('Erro ao salvar promoção:', e);
            alert(e.response?.data?.message || 'Erro ao salvar promoção.');
        } finally {
            salvandoPromo = false;
        }
    }

    onMount(async () => {
        try {
            const user = await getCurrentUser();
            if (user && user.role?.toLowerCase() === 'admin') {
                isAdmin = true;
            }

            const id = page.params.id || page.params.item;
            const res = await api.get(`/cardapio/${id}`);
            const body = res.data as ApiResponse<MenuItem>;
            
            if (body.success && body.data) {
                item = body.data;
            } else {
                error = body.message || 'Item não encontrado.';
            }
        }
        catch (e: any) {
            console.error('Erro ao carregar item:', e);
            const body = e.response?.data as ApiResponse<MenuItem> | undefined;
            error = body?.message || 'Erro ao carregar item do cardápio.';
        } finally {
            loading = false;
        }
    });
</script>

<Menu />

<main class="max-w-2xl mx-auto min-h-screen pt-32 md:pt-40 text-primary-50 px-4 pb-20">
    {#if loading}
        <div class="py-24 text-center">
            <p class="text-tertiary-300 font-bold uppercase tracking-widest text-xs">
                Carregando item...
            </p>
        </div>
    {:else if error}
        <div class="mt-4 py-12 text-center bg-primary-900 border border-primary-800 p-6 shadow-2xl rounded-2xl">
            <p class="text-red-400 font-semibold text-xs tracking-wide mb-4">
                {error}
            </p>
            <button 
                type="button"
                on:click={voltar}
                class="bg-tertiary-500 hover:bg-tertiary-600 text-primary-950 font-bold px-5 py-2.5 text-xs uppercase tracking-wider transition-colors rounded-xl cursor-pointer shadow-md"
            >
                Voltar
            </button> 
        </div>
    {:else if item}
        <div class="space-y-4">
            <!-- Botão de Voltar -->
            <button 
                type="button"
                on:click={voltar}
                class="bg-primary-900 hover:bg-primary-800 text-tertiary-200 border border-primary-800 font-bold px-4 py-2.5 text-xs uppercase tracking-wider transition-colors rounded-xl cursor-pointer flex items-center gap-2 shadow-sm"
            >
                <span class="text-tertiary-400">&larr;</span> Voltar ao Cardápio
            </button>
            
            <!-- Card Principal -->
            <section class="bg-primary-900 border border-primary-800 shadow-2xl rounded-2xl overflow-hidden relative">
                
                <!-- Botão Admin: Adicionar/Gerenciar Promoção -->
                {#if isAdmin}
                    <div class="absolute top-4 right-4 z-10">
                        <button
                            type="button"
                            on:click={abrirModalPromo}
                            class="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs uppercase tracking-wider shadow-lg transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                            <span>🏷️</span> {item.promocao ? 'Gerenciar Promoção' : 'Adicionar Promoção'}
                        </button>
                    </div>
                {/if}

                {#if item.imagem}
                    <div class="w-full h-72 md:h-96 bg-primary-950 border-b border-primary-800 overflow-hidden flex items-center justify-center">
                        <img
                            src={item.imagem}
                            alt={item.nome}
                            class="w-full h-full object-cover"
                        />
                    </div>
                {/if}

                <div class="p-6 md:p-8 space-y-6">
                    
                    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-primary-800 pb-6">
                        <div class="space-y-3">
                            <div class="flex items-center gap-2 flex-wrap">
                                {#if item.categoria}
                                    <Badge class="bg-primary-950 text-tertiary-300 border border-primary-800 rounded-xl text-[10px] font-bold uppercase tracking-widest px-3.5 py-1">
                                        {item.categoria}
                                    </Badge>
                                {/if}
                                {#if promocaoAtiva}
                                    <Badge class="bg-red-900/80 text-red-200 border border-red-700 rounded-xl text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                                        🔥 -{item.promocao}% OFF
                                    </Badge>
                                {/if}
                            </div>

                            <h1 class="text-2xl md:text-3xl font-bold text-tertiary-100 tracking-wide leading-tight">
                                {item.nome}
                            </h1>

                            <p class="text-tertiary-200 text-xs md:text-sm font-medium italic">
                                {item.resumo}
                            </p>

                            {#if item.promocao && item.promocao > 0 && item.fimpromocao}
                                <p class="text-xs text-amber-300/90 font-semibold pt-1">
                                    ⏰ Promoção termina em: {formatarDataExibicao(item.fimpromocao)}
                                </p>
                            {/if}
                        </div>

                        <!-- Preço -->
                        <div class="flex flex-col items-start sm:items-end">
                            {#if promocaoAtiva}
                                <span class="text-xs text-gray-400 line-through">
                                    {formatarPreco(item.preco)}
                                </span>
                            {/if}
                            <span class="text-2xl md:text-3xl font-black text-tertiary-400 whitespace-nowrap">
                                {formatarPreco(precoFinal)}
                            </span>
                        </div>
                    </div>

                    <div class="space-y-2.5">
                        <h2 class="text-[10px] font-bold text-tertiary-300 uppercase tracking-widest">
                            Descrição
                        </h2>
                        <p class="text-tertiary-100 text-xs md:text-sm leading-relaxed bg-primary-950 p-4 rounded-xl border border-primary-800 whitespace-pre-line">
                            {item.descricao}
                        </p>
                    </div>

                    <!-- Seletor de Quantidade e Botão de Ação -->
                    <div class="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        
                        <!-- Controles de Quantidade -->
                        <div class="flex items-center justify-between bg-primary-950 border border-primary-800 rounded-xl p-1.5 w-full sm:w-40">
                            <button
                                type="button"
                                on:click={() => alterarQuantidade(-1)}
                                class="w-10 h-10 bg-primary-900 hover:bg-primary-800 text-tertiary-200 font-bold rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                            >
                                -
                            </button>
                            <span class="text-tertiary-100 font-bold text-sm">
                                {quantidadeSelecionada}
                            </span>
                            <button
                                type="button"
                                on:click={() => alterarQuantidade(1)}
                                class="w-10 h-10 bg-primary-900 hover:bg-primary-800 text-tertiary-200 font-bold rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                            >
                                +
                            </button>
                        </div>

                        <!-- Botão Adicionar -->
                        <button
                            type="button"
                            on:click={adicionarAoCarrinho}
                            disabled={adicionando}
                            class="flex-1 bg-tertiary-500 hover:bg-tertiary-600 text-primary-950 font-black px-8 py-3.5 text-xs uppercase tracking-wider transition-colors rounded-xl cursor-pointer shadow-lg disabled:opacity-50"
                        >
                            {adicionando ? 'Adicionando...' : 'Adicionar ao Carrinho'}
                        </button>
                    </div>

                </div>
            </section>
        </div>
    {/if}
</main>

<!-- Modal de Gerenciamento de Promoção (Admin) -->
{#if mostrarModalPromo}
    <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-primary-900 border border-primary-800 p-6 rounded-2xl max-w-md w-full shadow-2xl space-y-4">
            <h3 class="text-base font-bold text-tertiary-100 uppercase tracking-wide">
                Gerenciar Promoção: {item?.nome}
            </h3>
            
            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-bold text-tertiary-300 uppercase tracking-wider mb-1">
                        Porcentagem de Desconto (%)
                    </label>
                    <input 
                        type="number" 
                        min="1" 
                        max="100" 
                        bind:value={novaPromocao}
                        class="w-full bg-primary-950 border border-primary-800 rounded-xl px-3 py-2 text-tertiary-100 text-sm focus:outline-none focus:border-tertiary-500"
                    />
                </div>

                <div>
                    <label class="block text-xs font-bold text-tertiary-300 uppercase tracking-wider mb-1">
                        Data/Hora de Início (Deixe vazio para ativar agora)
                    </label>
                    <input 
                        type="datetime-local" 
                        bind:value={dataInicio}
                        class="w-full bg-primary-950 border border-primary-800 rounded-xl px-3 py-2 text-tertiary-100 text-sm focus:outline-none focus:border-tertiary-500"
                    />
                </div>

                <div>
                    <label class="block text-xs font-bold text-tertiary-300 uppercase tracking-wider mb-1">
                        Data/Hora de Término (Deixe vazio para sem prazo)
                    </label>
                    <input 
                        type="datetime-local" 
                        bind:value={dataFim}
                        class="w-full bg-primary-950 border border-primary-800 rounded-xl px-3 py-2 text-tertiary-100 text-sm focus:outline-none focus:border-tertiary-500"
                    />
                </div>
            </div>

            <div class="flex flex-col gap-2.5 pt-2">
                <button
                    type="button"
                    on:click={salvarPromocao}
                    disabled={salvandoPromo}
                    class="w-full bg-tertiary-500 hover:bg-tertiary-600 text-primary-950 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                >
                    {salvandoPromo ? 'Salvando...' : 'Salvar Promoção'}
                </button>
                <button
                    type="button"
                    on:click={() => mostrarModalPromo = false}
                    class="w-full bg-primary-950 hover:bg-primary-800 text-tertiary-300 border border-primary-800 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors"
                >
                    Cancelar
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Modal de Sucesso Customizado (Promoção Salva) -->
{#if mostrarModalSucessoPromo}
    <div transition:fade class="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4 shadow-2xl text-center">
            
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
                on:click={() => (mostrarModalSucessoPromo = false)}
                class="w-full mt-2 py-3 bg-tertiary-500 hover:bg-tertiary-600 text-primary-950 font-black rounded-xl uppercase tracking-widest transition-all shadow-md cursor-pointer text-xs"
            >
                Entendido
            </button>
        </div>
    </div>
{/if}

<!-- Modal de Sucesso / Escolha (Carrinho) -->
{#if mostrarModal}
    <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div class="bg-primary-900 border border-primary-800 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl space-y-4">
            <h3 class="text-base font-bold text-tertiary-100 uppercase tracking-wide">
                Item adicionado com sucesso!
            </h3>
            <p class="text-xs text-tertiary-200">
                O que você deseja fazer agora?
            </p>
            <div class="flex flex-col gap-2.5 pt-2">
                <button
                    type="button"
                    on:click={() => goto('/carrinho')}
                    class="w-full bg-tertiary-500 hover:bg-tertiary-600 text-primary-950 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors"
                >
                    Ver Carrinho
                </button>
                <button
                    type="button"
                    on:click={() => { mostrarModal = false; goto('/Cardapio'); }}
                    class="w-full bg-primary-950 hover:bg-primary-800 text-tertiary-300 border border-primary-800 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors"
                >
                    Continuar Comprando
                </button>
            </div>
        </div>
    </div>
{/if}