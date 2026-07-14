  <script lang="ts">
    import { Heading, P } from 'flowbite-svelte';
    import Menu from '../../components/Menu.svelte';
    import { goto } from "$app/navigation";
    import { getCurrentUser, getToken, type User } from "$lib/auth"; 
    import { onMount } from 'svelte';

    let user: User | null = null;
    let loading = true;
    let error = '';

    let carrinho: any = null;
    let itensCarrinho: any[] = [];

    onMount(async () => {
      await inicializarInterface();
    });

    async function inicializarInterface() {
      const token = getToken();
      
      if (!token) {
        error = 'Acesso negado. É necessário estar autenticado para ver o carrinho.';
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

        // Chama a rota unificada do backend
        await carregarCarrinhoDoServidor();

      } catch (e: any) {
        console.error('Erro na inicialização:', e);
        error = e.message || 'Erro crítico ao carregar dados da sessão.';
      } finally {
        loading = false;
      }
    }

    async function carregarCarrinhoDoServidor() {
      try {
        const token = getToken();
        
        // Chamada limpa baseada estritamente no Token autenticado
        const response = await fetch(`http://localhost:3000/carrinho`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Falha ao processar carrinho no servidor.');
        }

        if (result.success && result.data) {
          carrinho = result.data.carrinho;           
          itensCarrinho = result.data.itens || [];    
        }
      } catch (err: any) {
        console.error(err);
        error = err.message || 'Não foi possível estabelecer conexão com o carrinho.';
      }
    }
  </script>

  <Menu />

  <main class="max-w-5xl mx-auto px-6 md:px-12 pt-32 md:pt-40 pb-16 text-neutral-100 relative z-30">
    
    <section class="text-center mb-16">
      <Heading tag="h1" class="text-4xl md:text-6xl font-black tracking-[0.2em] text-white uppercase font-serif">
        carrinho
      </Heading>
      <div class="w-20 h-[2px] bg-amber-600 mx-auto mt-6 mb-4"></div>
      
      {#if user}
        <P class="text-[10px] text-neutral-400 tracking-widest uppercase font-medium">
          Usuário: <span class="text-amber-500 font-bold">{user.login}</span> 
          <span class="text-neutral-600">({user.role})</span>
        </P>
      {/if}
    </section>

    {#if loading}
      <div class="text-center text-neutral-400 font-medium uppercase tracking-widest animate-pulse font-serif py-12">
        Autenticando e varrendo carrinho...
      </div>
    {:else}
      <div class="w-full bg-primary-350/80 backdrop-blur-lg border border-primary-350 rounded-none shadow-2xl p-5 sm:p-8 flex flex-col gap-6">
        
        {#if error}
          <div class="text-center py-6 border border-red-900/40 bg-red-950/20 p-4">
            <p class="text-xs text-red-400 font-medium tracking-wide">{error}</p>
            <button on:click={() => goto('/perfil')} class="mt-4 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Voltar ao Perfil</button>
          </div>

        {:else if itensCarrinho.length === 0}
          <div class="text-center py-12 text-neutral-400 text-xs tracking-wider uppercase font-light">
            Seu carrinho está vazio. Visite nosso cardápio!
          </div>
        {:else}
          <div class="flex flex-col gap-4">
            {#each itensCarrinho as item}
              <div class="flex items-center justify-between border-b border-neutral-800/40 pb-4 gap-4 text-neutral-900">
                <div class="flex items-center gap-4">
                  {#if item.imagem}
                    <img src={item.imagem} alt={item.nome} class="w-12 h-12 object-cover border border-black grayscale contrast-125" />
                  {/if}
                  <div>
                    <h4 class="text-sm font-bold uppercase tracking-wide text-neutral-100">{item.nome}</h4>
                    <p class="text-[11px] text-amber-600/90 font-medium uppercase tracking-wider">{item.tamanho} • {item.categoria}</p>
                  </div>
                </div>
                
                <div class="text-right">
                  <p class="text-xs text-neutral-300 tracking-wide font-light">Qtd: <span class="font-bold text-neutral-100">{item.quantidade}</span></p>
                  <p class="text-xs font-black text-amber-500 tracking-wide mt-1">R$ {parseFloat(item.subtotal).toFixed(2)}</p>
                </div>
              </div>
            {/each}
          </div>

          <div class="mt-4 pt-6 border-t border-t-neutral-800/40 bg-neutral-950/40 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p class="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Total Acumulado ({carrinho?.quantidade || 0} itens)</p>
              <p class="text-xl font-black text-amber-500 tracking-wider mt-1 font-serif">R$ {parseFloat(carrinho?.preco_total || 0).toFixed(2)}</p>
            </div>
            
            <button class="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-neutral-950 font-black rounded-none text-xs uppercase tracking-widest transition-all duration-300 shadow-lg">
              Fechar Pedido
            </button>
          </div>
        {/if}

      </div>
    {/if}
  </main>