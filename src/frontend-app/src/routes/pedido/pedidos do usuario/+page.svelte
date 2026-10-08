<script lang="ts">
    import { Heading, P } from 'flowbite-svelte';
    import Menu from '../../../components/Menu.svelte';
    import { goto } from "$app/navigation";
    import { page } from "$app/stores";
    import { getToken, getCurrentUser, type User } from "$lib/auth";
    import { onMount } from 'svelte';
    import api from '$lib/api';

    let user: User | null = null;
    let loading = true;
    let error = '';
    let pedidosUsuario: any[] = [];

    // Pega o id da URL de forma reativa e segura
    $: userId =$page.params.id;

    onMount(async () => {
        await inicializarInterface();
    });

    async function inicializarInterface() {
        const token = getToken();
        if (!token) {
            goto('/login');
            return;
        }

        try {
            const userData = await getCurrentUser();
            if (!userData || userData.role?.toLowerCase() !== 'admin') {
                error = 'Acesso negado. Apenas administradores podem ver pedidos de outros usuários.';
                loading = false;
                return;
            }
            user = userData;

            if (userId) {
                await carregarPedidosDoUsuario();
            } else {
                error = 'ID de usuário não fornecido na URL.';
                loading = false;
            }
        } catch (e: any) {
            console.error('Erro na inicialização:', e);
            error = e.message || 'Erro ao carregar dados.';
            loading = false;
        }
    }

    async function carregarPedidosDoUsuario() {
        try {
            const response = await api.get(`/pedido/usuario/${userId}`);
            pedidosUsuario = response.data.pedidos || response.data || [];
        } catch (err: any) {
            console.error('Erro ao carregar pedidos do usuário:', err);
            error = err.response?.data?.message || 'Não foi possível carregar os pedidos deste usuário.';
        } finally {
            loading = false;
        }
    }

    function corStatus(status: string) {
        switch (status?.toLowerCase()) {
            case 'pendente': return 'bg-yellow-950/40 text-yellow-400 border-yellow-900/50';
            case 'preparando': return 'bg-blue-950/40 text-blue-400 border-blue-900/50';
            case 'saiu para entrega': return 'bg-purple-950/40 text-purple-400 border-purple-900/50';
            case 'entregue': return 'bg-green-950/40 text-green-400 border-green-900/50';
            case 'cancelado': return 'bg-red-950/40 text-red-400 border-red-900/50';
            default: return 'bg-primary-800 text-primary-200 border-primary-700';
        }
    }
</script>

<Menu />

<main class="max-w-4xl mx-auto px-4 md:px-8 pt-32 md:pt-40 pb-20 text-primary-50 relative z-30 flex flex-col gap-10">
    
    <section class="text-center space-y-3">
        <Heading tag="h1" class="text-3xl md:text-5xl font-black tracking-[0.15em] text-primary-50 uppercase font-serif">
            Pedidos do Usuário
        </Heading>
        <div class="w-16 h-0.5 bg-tertiary-500 mx-auto"></div>
        <P class="text-xs text-primary-300 tracking-widest uppercase font-semibold">
            Visualizando histórico do cliente ID: <span class="text-tertiary-400 font-bold">{userId}</span>
        </P>
    </section>

    {#if loading}
        <div class="text-center text-primary-300 font-medium uppercase tracking-widest py-16 text-xs">
            Carregando pedidos...
        </div>
    {:else if error}
        <div class="text-center border border-red-900/40 bg-red-950/20 rounded-xl p-4">
            <p class="text-xs text-red-400 font-medium tracking-wide">{error}</p>
            <button on:click={() => history.back()} class="mt-4 px-5 py-2 bg-primary-800 hover:bg-primary-700 text-primary-50 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer">Voltar</button>
        </div>
    {:else if pedidosUsuario.length === 0}
        <div class="w-full bg-primary-900/90 backdrop-blur-md border border-primary-800 rounded-2xl shadow-2xl p-12 text-center text-primary-300 text-xs tracking-wider uppercase font-medium space-y-4">
            <p>Este usuário ainda não realizou ou cancelou nenhum pedido.</p>
            <div>
                <button on:click={() => history.back()} class="px-6 py-3 bg-tertiary-500 text-primary-950 text-xs font-bold uppercase tracking-widest hover:bg-tertiary-600 transition-colors rounded-xl shadow-md cursor-pointer">
                    Voltar
                </button>
            </div>
        </div>
    {:else}
        <div class="flex flex-col gap-6">
            {#each pedidosUsuario as pedido}
                <div class="bg-primary-900/90 backdrop-blur-md border border-primary-800 rounded-2xl p-6 flex flex-col gap-5 shadow-xl">
                    
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-primary-800 pb-3 gap-2 text-xs">
                        <div class="flex items-center gap-3">
                            <span class="font-black text-tertiary-400 tracking-wider text-sm">PEDIDO #{pedido.id}</span>
                            {#if pedido.status_pedido}
                                <span class={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${corStatus(pedido.status_pedido)}`}>
                                    {pedido.status_pedido}
                                </span>
                            {/if}
                        </div>
                        <span class="text-primary-300 font-medium">
                            {new Date(pedido.data_compra).toLocaleDateString('pt-BR')} às {new Date(pedido.data_compra).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>

                    <!-- Itens do Pedido -->
                    <div class="flex flex-col gap-2.5 text-xs">
                        <span class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Itens:</span>
                        <div class="flex flex-col gap-2">
                            {#each pedido.itens || [] as item}
                                <div class="flex items-center justify-between bg-primary-950/50 p-3 rounded-xl border border-primary-800/60 gap-4">
                                    <div class="flex items-center gap-3">
                                        {#if item.imagem}
                                            <img src={item.imagem} alt={item.nome_produto} class="w-10 h-10 object-cover rounded-lg border border-primary-800" />
                                        {/if}
                                        <div>
                                            <p class="font-bold text-primary-50 uppercase">{item.nome_produto}</p>
                                            <p class="text-[10px] text-primary-400">Qtd: {item.quantidade}x • Unit: R$ {Number(item.preco_unitario).toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <span class="font-black text-tertiary-400">R$ {Number(item.subtotal).toFixed(2)}</span>
                                </div>
                            {/each}
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-t border-primary-800 pt-4 gap-4 text-xs">
                        <div class="space-y-1">
                            <p class="text-[11px] text-primary-300"><strong>Endereço:</strong> {pedido.endereco}</p>
                            <p class="text-[11px] text-primary-300"><strong>Pagamento:</strong> {pedido.form_pag}</p>
                        </div>
                        <div class="text-right self-end sm:self-auto min-w-[120px] bg-primary-950/60 p-3 rounded-xl border border-primary-800">
                            <span class="text-[10px] font-bold uppercase tracking-widest text-primary-400 block">Total do Pedido</span>
                            <span class="text-base font-black text-tertiary-400 font-serif">R$ {Number(pedido.preco_pedido).toFixed(2)}</span>
                        </div>
                    </div>

                </div>
            {/each}
        </div>
    {/if}
</main>