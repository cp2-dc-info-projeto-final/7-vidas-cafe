<script lang="ts">
    import { Heading, P } from 'flowbite-svelte';
    import Menu from '../../components/Menu.svelte';
    import { goto } from "$app/navigation";
    import { getCurrentUser, getToken, type User } from "$lib/auth"; 
    import { onMount } from 'svelte';
    import api from '$lib/api';
    import { fade } from 'svelte/transition';

    let user: User | null = null;
    let loading = true;
    let error = '';
    let meusPedidos: any[] = [];

    // Estados para Modais Customizados
    let mostrarModalAlerta = false;
    let mensagemAlerta = '';

    let mostrarModalConfirmacao = false;
    let mensagemConfirmacao = '';
    let acaoConfirmacao: (() => void) | null = null;

    let mostrarModalSucessoStatus = false;
    let mensagemSucessoStatus = '';

    onMount(async () => {
        await inicializarInterface();
    });

    function dispararAlerta(msg: string) {
        mensagemAlerta = msg;
        mostrarModalAlerta = true;
    }

    async function inicializarInterface() {
        const token = getToken();
        
        if (!token) {
            error = 'Acesso negado. É necessário estar autenticado para ver seus pedidos.';
            loading = false;
            goto('/login');
            return;
        }

        try {
            const userData = await getCurrentUser();
            if (!userData) {
                error = 'Sessão inválida. Por favor, refaça o login.';
                goto('/login');
                return;
            }
            user = userData;

            await carregarPedidosDoServidor();

        } catch (e: any) {
            console.error('Erro na inicialização:', e);
            error = e.message || 'Erro crítico ao carregar dados da sessão.';
        } finally {
            loading = false;
        }
    }

    async function carregarPedidosDoServidor() {
        try {
            const response = await api.get('/pedido/meus-pedidos');
            meusPedidos = response.data || [];
        } catch (err: any) {
            console.error('Erro ao carregar pedidos:', err);
            error = err.response?.data?.message || 'Não foi possível carregar o histórico de pedidos.';
        }
    }

    function cancelarPedido(id: number) {
        mensagemConfirmacao = 'Tem certeza que deseja cancelar este pedido?';
        acaoConfirmacao = async () => {
            try {
                await api.delete(`/pedido/${id}`);
                meusPedidos = meusPedidos.filter(p => p.id !== id);
                dispararAlerta('Pedido cancelado com sucesso.');
            } catch (err: any) {
                dispararAlerta(err.response?.data?.message || 'Erro ao cancelar o pedido.');
            }
        };
        mostrarModalConfirmacao = true;
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

    async function alterarStatusPedido(pedidoId: number, novoStatus: string) {
        try {
            const response = await api.patch(`/pedido/${pedidoId}/status`, {
                status: novoStatus
            });
            
            meusPedidos = meusPedidos.map(p => {
                if (p.id === pedidoId) {
                    return { ...p, status_pedido: novoStatus };
                }
                return p;
            });

            mensagemSucessoStatus = response.data.message || 'Status atualizado com sucesso!';
            mostrarModalSucessoStatus = true;
        } catch (err: any) {
            dispararAlerta(err.response?.data?.message || 'Erro ao atualizar o status do pedido.');
        }
    }
</script>

<Menu />

<main class="max-w-4xl mx-auto px-4 md:px-8 pt-32 md:pt-40 pb-20 text-primary-50 relative z-30 flex flex-col gap-10">
    
    <!-- Cabeçalho -->
    <section class="text-center space-y-3">
        <Heading tag="h1" class="text-3xl md:text-5xl font-black tracking-[0.15em] text-primary-50 uppercase font-serif">
            Meus Pedidos
        </Heading>
        <div class="w-16 h-0.5 bg-tertiary-500 mx-auto"></div>
        
        {#if user}
            <P class="text-[10px] text-primary-300 tracking-widest uppercase font-semibold">
                Cliente: <span class="text-tertiary-400 font-bold">{user.login}</span> 
                <span class="text-primary-500">({user.role})</span>
            </P>
        {/if}
    </section>

    {#if loading}
        <div class="text-center text-primary-300 font-medium uppercase tracking-widest py-16 text-xs">
            Carregando seus pedidos...
        </div>
    {:else}
        
        {#if error}
            <div class="text-center border border-red-900/40 bg-red-950/20 rounded-xl p-4">
                <p class="text-xs text-red-400 font-medium tracking-wide">{error}</p>
                <button on:click={() => goto('/perfil')} class="mt-4 px-5 py-2 bg-primary-800 hover:bg-primary-700 text-primary-50 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer">Voltar ao Perfil</button>
            </div>
        {:else if meusPedidos.length === 0}
            <div class="w-full bg-primary-900/90 backdrop-blur-md border border-primary-800 rounded-2xl shadow-2xl p-12 text-center text-primary-300 text-xs tracking-wider uppercase font-medium space-y-4">
                <p>Você ainda não realizou nenhum pedido.</p>
                <div>
                    <button on:click={() => goto('/Cardapio')} class="px-6 py-3 bg-tertiary-500 text-primary-950 text-xs font-bold uppercase tracking-widest hover:bg-tertiary-600 transition-colors rounded-xl shadow-md cursor-pointer">
                        Ir para o Cardápio
                    </button>
                </div>
            </div>
        {:else}
            <!-- Lista de Pedidos -->
            <div class="flex flex-col gap-6">
                {#each meusPedidos as pedido}
                    <div class="bg-primary-900/90 backdrop-blur-md border border-primary-800 rounded-2xl p-6 flex flex-col gap-5 shadow-xl">
                        
                        <!-- Topo do Card do Pedido -->
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-primary-800 pb-3 gap-2 text-xs">
                            <div class="flex items-center gap-3">
                                <span class="font-black text-tertiary-400 tracking-wider text-sm">PEDIDO</span>
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

                        <!-- Seletor de Status exclusivo para o Admin -->
                        {#if user && user.role?.toLowerCase() === 'admin'}
                            <div class="flex items-center gap-2 mt-4 pt-4 border-t border-primary-800">
                                <label for={`status-${pedido.id}`} class="text-[10px] font-bold uppercase tracking-widest text-primary-300">
                                    Alterar Status:
                                </label>
                                
                                <select 
                                    id={`status-${pedido.id}`}
                                    value={pedido.status_pedido}
                                    on:change={(e) => alterarStatusPedido(pedido.id, e.currentTarget.value)}
                                    class="bg-primary-950 text-primary-50 border border-primary-700 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-tertiary-500 cursor-pointer"
                                >
                                    <option value="pendente">Pendente</option>
                                    <option value="preparando">Preparando</option>
                                    <option value="saiu para entrega">Saiu para Entrega</option>
                                    <option value="entregue">Entregue</option>
                                    <option value="cancelado">Cancelado</option>
                                </select>
                            </div>
                        {/if}

                        <!-- Itens do Pedido -->
                        <div class="flex flex-col gap-2.5 text-xs">
                            <span class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Itens Comprados:</span>
                            <div class="flex flex-col gap-2">
                                {#each pedido.itens as item}
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

                        <!-- Informações de Entrega -->
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center border-t border-primary-800 pt-4 gap-4 text-xs">
                            <div class="space-y-1">
                                <p class="text-[11px] text-primary-300"><strong>Endereço:</strong> {pedido.endereco}</p>
                                <p class="text-[11px] text-primary-300"><strong>Pagamento:</strong> {pedido.form_pag}</p>
                                {#if pedido.cupom}
                                    <p class="text-[11px] text-tertiary-400"><strong>Cupom Aplicado:</strong> {pedido.cupom}</p>
                                {/if}
                            </div>
                            <div class="text-right self-end sm:self-auto min-w-[120px] bg-primary-950/60 p-3 rounded-xl border border-primary-800">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-primary-400 block">Total do Pedido</span>
                                <span class="text-base font-black text-tertiary-400 font-serif">R$ {Number(pedido.preco_pedido).toFixed(2)}</span>
                            </div>
                        </div>

                        <!-- Botão de Ação / Cancelar -->
                        <div class="flex justify-between items-center pt-4 border-t border-primary-800">
                            <button 
                                type="button"
                                on:click={() => cancelarPedido(pedido.id)}
                                class="px-4 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/50 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                                Cancelar Pedido
                            </button>
                        </div>

                    </div>
                {/each}
            </div>
        {/if}

    {/if}
</main>

<!-- Modal de Alerta Customizado -->
{#if mostrarModalAlerta}
    <div transition:fade class="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4 shadow-2xl text-center">
            <div class="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center text-3xl mb-1">
                ⚠️
            </div>
            <h3 class="font-serif font-bold text-amber-400 text-xl uppercase tracking-wider">
                Aviso
            </h3>
            <p class="text-xs text-primary-200 leading-relaxed">
                {mensagemAlerta}
            </p>
            <button 
                type="button" 
                on:click={() => (mostrarModalAlerta = false)}
                class="w-full mt-2 py-3 bg-tertiary-500 hover:bg-tertiary-600 text-primary-950 font-black rounded-xl uppercase tracking-widest transition-all shadow-md cursor-pointer text-xs"
            >
                Entendido
            </button>
        </div>
    </div>
{/if}

<!-- Modal de Confirmação Customizado (Substitui o Confirm nativo) -->
{#if mostrarModalConfirmacao}
    <div transition:fade class="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4 shadow-2xl text-center">
            <div class="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-3xl mb-1">
                ❓
            </div>
            <h3 class="font-serif font-bold text-red-400 text-xl uppercase tracking-wider">
                Confirmação
            </h3>
            <p class="text-xs text-primary-200 leading-relaxed">
                {mensagemConfirmacao}
            </p>
            <div class="grid grid-cols-2 gap-3 w-full mt-2">
                <button 
                    type="button" 
                    on:click={() => (mostrarModalConfirmacao = false)}
                    class="py-3 bg-primary-950 hover:bg-primary-800 text-tertiary-300 border border-primary-800 font-bold rounded-xl uppercase tracking-widest transition-all cursor-pointer text-xs"
                >
                    Não
                </button>
                <button 
                    type="button" 
                    on:click={() => {
                        mostrarModalConfirmacao = false;
                        if (acaoConfirmacao) acaoConfirmacao();
                    }}
                    class="py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl uppercase tracking-widest transition-all shadow-md cursor-pointer text-xs"
                >
                    Sim
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Modal de Sucesso Customizado (Status Atualizado) -->
{#if mostrarModalSucessoStatus}
    <div transition:fade class="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4 shadow-2xl text-center">
            <div class="w-16 h-16 bg-tertiary-500/20 text-tertiary-400 rounded-full flex items-center justify-center text-3xl mb-1">
                ✓
            </div>
            <h3 class="font-serif font-bold text-tertiary-400 text-xl uppercase tracking-wider">
                Sucesso!
            </h3>
            <p class="text-xs text-primary-200 leading-relaxed">
                {mensagemSucessoStatus}
            </p>
            <button 
                type="button" 
                on:click={() => (mostrarModalSucessoStatus = false)}
                class="w-full mt-2 py-3 bg-tertiary-500 hover:bg-tertiary-600 text-primary-950 font-black rounded-xl uppercase tracking-widest transition-all shadow-md cursor-pointer text-xs"
            >
                Entendido
            </button>
        </div>
    </div>
{/if}