<script lang="ts">
    import { Badge } from 'flowbite-svelte';
    import api from '$lib/api';
    import type { ApiResponse } from '$lib/api';
    import { onMount } from 'svelte';
    import Menu from '../../../components/Menu.svelte';
    import { page } from '$app/state';
 
    interface MenuItem {
        id: number;
        nome: string;
        preco: number;
        categoria: string;
        resumo: string;
        descricao: string;
        imagem?: string | null;
    }

    let item: MenuItem | null = null;
    let loading = true;
    let error = '';
    
    function formatarPreco(valor: number): string {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(Number(valor));
    }

    function voltar() {
        if (typeof window !== 'undefined') {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/cardapio';
            }
        }
    }

    onMount(async () => {
        try {
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

<main class="max-w-2xl mx-auto min-h-screen pt-32 md:pt-40 text-neutral-100 px-4 pb-16">
    {#if loading}
        <div class="py-16 text-center">
            <p class="text-neutral-400 font-medium uppercase tracking-widest text-xs animate-pulse">
                Carregando...
            </p>
        </div>
    {:else if error}
        <div class="mt-4 py-12 text-center bg-neutral-900 border border-neutral-800 p-5 shadow-xl">
            <p class="text-red-500 font-semibold text-xs tracking-wide">
                {error}
            </p>
            <button 
                type="button"
                on:click={voltar}
                class="mt-4 bg-amber-600 hover:bg-amber-700 text-neutral-950 font-bold px-4 py-2 text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
                Voltar
            </button> 
        </div>
    {:else if item}
        <div>
            <!-- Botão Voltar alinhado e afastado do navbar -->
            <button 
                type="button"
                on:click={voltar}
                class="mt-4 mb-4 bg-amber-600 hover:bg-amber-700 text-neutral-950 font-bold px-4 py-2 text-xs uppercase tracking-wider transition-colors cursor-pointer shadow"
            >
                &larr; Voltar ao Cardápio
            </button>
            
            <!-- Estética igual ao modal: fundo bg-neutral-900 com borda cinza escura/neutra -->
            <section class="bg-neutral-900 border border-neutral-800 shadow-2xl rounded-none overflow-hidden">
                
                {#if item.imagem}
                    <div class="w-full h-64 md:h-96 bg-neutral-950 border-b border-neutral-800 overflow-hidden flex items-center justify-center">
                        <img
                            src={item.imagem}
                            alt={item.nome}
                            class="w-full h-full object-cover"
                        />
                    </div>
                {/if}

                <div class="p-6 md:p-8 space-y-6">
                    
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-800 pb-5">
                        <div class="space-y-2">
                            {#if item.categoria}
                                <Badge class="bg-neutral-950 text-amber-500 border border-neutral-800 rounded-none text-[9px] font-bold uppercase tracking-widest px-3 py-1">
                                    {item.categoria}
                                </Badge>
                            {/if}

                            <h1 class="text-2xl md:text-3xl font-black text-neutral-100 tracking-wide leading-tight">
                                {item.nome}
                            </h1>

                            <p class="text-neutral-400 text-xs md:text-sm font-medium italic">
                                {item.resumo}
                            </p>
                        </div>

                        <span class="text-xl md:text-3xl font-black text-amber-500 whitespace-nowrap">
                            {formatarPreco(item.preco)}
                        </span>
                    </div>

                    <div class="space-y-2">
                        <h2 class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                            Descrição
                        </h2>
                        <!-- Caixa estilo input/textarea do modal (bg-neutral-950 com borda sutil) -->
                        <p class="text-neutral-300 text-xs md:text-sm leading-relaxed whitespace-pre-line bg-neutral-950 p-4 border border-neutral-800">
                            {item.descricao}
                        </p>
                    </div>

                    <div class="pt-2">
                        <button
                            type="button"
                            class="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-neutral-950 font-bold px-8 py-3.5 text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                        >
                            Adicionar ao Carrinho
                        </button>
                    </div>

                </div>
            </section>
        </div>
    {/if}
</main>