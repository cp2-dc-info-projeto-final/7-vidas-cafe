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
            <section class="bg-primary-900 border border-primary-800 shadow-2xl rounded-2xl overflow-hidden">
                
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
                            {#if item.categoria}
                                <Badge class="bg-primary-950 text-tertiary-300 border border-primary-800 rounded-xl text-[10px] font-bold uppercase tracking-widest px-3.5 py-1">
                                    {item.categoria}
                                </Badge>
                            {/if}

                            <!-- Título principal com mais destaque usando tom quente do tertiary -->
                            <h1 class="text-2xl md:text-3xl font-bold text-tertiary-100 tracking-wide leading-tight">
                                {item.nome}
                            </h1>

                            <!-- Resumo com tom de laranja suave (tertiary-200) para ótimo contraste -->
                            <p class="text-tertiary-200 text-xs md:text-sm font-medium italic">
                                {item.resumo}
                            </p>
                        </div>

                        <!-- Preço -->
                        <span class="text-2xl md:text-3xl font-black text-tertiary-400 whitespace-nowrap">
                            {formatarPreco(item.preco)}
                        </span>
                    </div>

                    <div class="space-y-2.5">
                        <!-- Título da seção da descrição com tom laranja claro -->
                        <h2 class="text-[10px] font-bold text-tertiary-300 uppercase tracking-widest">
                            Descrição
                        </h2>
                        <!-- Caixa da descrição com texto super legível -->
                        <p class="text-tertiary-100 text-xs md:text-sm leading-relaxed bg-primary-950 p-4 rounded-xl border border-primary-800 whitespace-pre-line">
                            {item.descricao}
                        </p>
                    </div>

                    <div class="pt-2">
                        <!-- Botão de Ação -->
                        <button
                            type="button"
                            class="w-full sm:w-auto bg-tertiary-500 hover:bg-tertiary-600 text-primary-950 font-black px-8 py-3.5 text-xs uppercase tracking-wider transition-colors rounded-xl cursor-pointer shadow-lg"
                        >
                            Adicionar ao Carrinho
                        </button>
                    </div>

                </div>
            </section>
        </div>
    {/if}
</main>