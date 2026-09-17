<script lang="ts">
  import { Heading, P } from 'flowbite-svelte';
  import Menu from '../../components/Menu.svelte';
  import { goto } from "$app/navigation";
  import { getCurrentUser, getToken, type User } from "$lib/auth"; 
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import api from '$lib/api';

  let user: User | null = null;
  let loading = true;
  let error = '';
  let actionLoading = false;
  let mostrandoCheckout = false;

  let carrinho: any = null;
  let itensCarrinho: any[] = [];

  // Dados de Endereço Separados (para a busca do ViaCEP)
  let cep = '';
  let rua = '';
  let numero = '';
  let bairro = '';
  let cidade = '';
  let uf = '';
  let complemento = '';
  let erroCep = '';

  // Outros dados do Checkout
  let form_pag = 'Cartão de Crédito';
  let cupom = '';

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
          const response = await api.get('/carrinho');
          const result = response.data;

          if (result.success && result.data) {
              carrinho = result.data.carrinho;          
              itensCarrinho = result.data.itens || [];    
          }
      } catch (err: any) {
          console.error(err);
          error = err.response?.data?.message || 'Não foi possível estabelecer conexão com o carrinho.';
      }
  }

  // Função para buscar o CEP automaticamente no ViaCEP
  async function buscarCep() {
      const cepLimpo = cep.replace(/\D/g, '');

      if (cepLimpo.length !== 8) {
          return; 
      }

      try {
          erroCep = '';
          const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
          const data = await res.json();

          if (data.erro) {
              erroCep = 'CEP não encontrado.';
              return;
          }

          rua = data.logradouro;
          bairro = data.bairro;
          cidade = data.localidade;
          uf = data.uf;
          
      } catch (e) {
          console.error('Erro ao buscar CEP:', e);
          erroCep = 'Erro ao consultar o CEP.';
      }
  }

  async function alterarQuantidadeItem(itemId: number, novaQuantidade: number) {
      if (novaQuantidade <= 0) {
          await removerItem(itemId);
          return;
      }

      try {
          const res = await api.put(`/carrinho/item/${itemId}`, {
              quantidade: novaQuantidade
          });

          if (res.data.success) {
              await carregarCarrinhoDoServidor();
          }
      } catch (e: any) {
          console.error('Erro ao atualizar quantidade:', e);
          alert(e.response?.data?.message || 'Erro ao atualizar quantidade.');
      }
  }

  async function removerItem(itemId: number) {
      try {
          const res = await api.delete(`/carrinho/item/${itemId}`);
          if (res.data.success) {
              await carregarCarrinhoDoServidor();
          }
      } catch (e: any) {
          console.error('Erro ao remover item:', e);
          alert(e.response?.data?.message || 'Erro ao remover item.');
      }
  }

  async function finalizarPedido() {
      // Validação dos campos obrigatórios de endereço
      if (!cep.trim() || !rua.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !uf.trim()) {
          alert('Por favor, preencha todos os campos obrigatórios do endereço (CEP, Rua, Número, Bairro, Cidade e UF).');
          return;
      }

      // Monta a string completa para enviar ao backend mantendo a compatibilidade
      const enderecoCompleto = `CEP: ${cep}, ${rua}, nº ${numero}${complemento ? ' - ' + complemento : ''}, ${bairro} - ${cidade}/${uf}`;

      actionLoading = true;
      error = '';

      try {
          const response = await api.post('/pedido', {
              endereco: enderecoCompleto,
              form_pag,
              cupom: cupom || null
          });

          alert(response.data.message || 'Pedido realizado com sucesso!');
          goto('/pedido'); 
      } catch (e: any) {
          console.error('Erro ao finalizar pedido:', e);
          const mensagemErro = e.response?.data?.message || e.message || 'Erro ao processar o pedido.';
          alert(mensagemErro);
      } finally {
          actionLoading = false;
      }
  }
</script>

<Menu />

<main class="max-w-4xl mx-auto px-4 md:px-8 pt-32 md:pt-40 pb-20 text-primary-50 relative z-30">
  
  <!-- Cabeçalho -->
  <section class="text-center mb-12 space-y-3">
      <Heading tag="h1" class="text-3xl md:text-5xl font-black tracking-[0.15em] text-primary-50 uppercase font-serif">
          Seu Carrinho
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
          Carregando seu carrinho...
      </div>
  {:else}
      <div class="w-full bg-primary-900/90 backdrop-blur-md border border-primary-800 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col gap-6">
          
          {#if error}
              <div class="text-center py-8 border border-red-900/40 bg-red-950/20 rounded-xl p-4">
                  <p class="text-xs text-red-400 font-medium tracking-wide">{error}</p>
                  <button on:click={() => goto('/perfil')} class="mt-4 px-5 py-2 bg-primary-800 hover:bg-primary-700 text-primary-50 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer">Voltar ao Perfil</button>
              </div>

          {:else if itensCarrinho.length === 0}
              <div class="text-center py-16 text-primary-300 text-xs tracking-wider uppercase font-medium space-y-4">
                  <p>Seu carrinho está vazio no momento.</p>
                  <div>
                      <button on:click={() => goto('/Cardapio')} class="px-6 py-3 bg-tertiary-500 text-primary-950 text-xs font-bold uppercase tracking-widest hover:bg-tertiary-600 transition-colors rounded-xl shadow-md cursor-pointer">
                          Ir para o Cardápio
                      </button>
                  </div>
              </div>
          {:else}
              
              <!-- Lista de Itens -->
              <div class="flex flex-col divide-y divide-primary-800/60">
                  {#each itensCarrinho as item}
                      <div class="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          
                          <div class="flex items-center gap-4">
                              {#if item.imagem}
                                  <img src={item.imagem} alt={item.nome} class="w-14 h-14 object-cover rounded-xl border border-primary-800 shadow-sm" />
                              {/if}
                              <div class="space-y-1">
                                  <h4 class="text-sm font-bold uppercase tracking-wide text-primary-50">{item.nome}</h4>
                                  <p class="text-[10px] text-tertiary-400 font-bold uppercase tracking-wider">{item.categoria}</p>
                              </div>
                          </div>
                          
                          <div class="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                              
                              <div class="flex items-center border border-primary-800 bg-primary-950 rounded-xl p-1 gap-3 shadow-inner">
                                  <button 
                                      on:click={() => alterarQuantidadeItem(item.id, item.quantidade - 1)}
                                      class="w-7 h-7 bg-primary-900 hover:bg-primary-800 text-primary-200 font-bold rounded-lg flex items-center justify-center text-xs transition-colors cursor-pointer"
                                  >
                                      -
                                  </button>
                                  <span class="text-xs font-bold text-primary-100 px-1">{item.quantidade}</span>
                                  <button 
                                      on:click={() => alterarQuantidadeItem(item.id, item.quantidade + 1)}
                                      class="w-7 h-7 bg-primary-900 hover:bg-primary-800 text-primary-200 font-bold rounded-lg flex items-center justify-center text-xs transition-colors cursor-pointer"
                                  >
                                      +
                                  </button>
                              </div>

                              <div class="text-right min-w-[90px]">
                                  <p class="text-xs font-black text-tertiary-400 tracking-wide">R$ {parseFloat(item.subtotal).toFixed(2)}</p>
                                  <button 
                                      on:click={() => removerItem(item.id)}
                                      class="text-[10px] text-red-400 hover:text-red-300 font-semibold tracking-wider uppercase mt-1 cursor-pointer transition-colors"
                                  >
                                      Remover
                                  </button>
                              </div>
                          </div>

                      </div>
                  {/each}
              </div>

              <!-- Resumo e Botão de Fechar Pedido -->
              <div class="mt-4 pt-6 border-t border-primary-800 bg-primary-950/60 p-5 rounded-2xl flex flex-col gap-4 shadow-inner">
                  <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                          <p class="text-[10px] font-bold text-primary-300 uppercase tracking-widest">
                              Total Acumulado ({carrinho?.quantidade || 0} {carrinho?.quantidade === 1 ? 'item' : 'itens'})
                          </p>
                          <p class="text-2xl font-black text-tertiary-400 tracking-wider mt-1 font-serif">
                              R$ {parseFloat(carrinho?.preco_total || 0).toFixed(2)}
                          </p>
                      </div>
                      
                      {#if !mostrandoCheckout}
                          <button 
                              on:click={() => mostrandoCheckout = true} 
                              class="w-full sm:w-auto px-8 py-3.5 bg-tertiary-500 hover:bg-tertiary-600 text-primary-950 font-black rounded-xl text-xs uppercase tracking-widest transition-all duration-300 shadow-lg cursor-pointer"
                          >
                              Fechar Pedido
                          </button>
                      {/if}
                  </div>

                  <!-- Formulário de Checkout com Busca de CEP -->
                  {#if mostrandoCheckout}
                      <div transition:slide class="flex flex-col gap-4 pt-4 border-t border-primary-800 text-xs">
                          <h3 class="font-serif font-bold text-tertiary-400 text-sm">Dados de Entrega e Pagamento</h3>
                          
                          <!-- Linha 1: CEP e Rua -->
                          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div class="flex flex-col gap-1.5">
                                  <label for="cep" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">CEP</label>
                                  <input 
                                      id="cep"
                                      type="text" 
                                      bind:value={cep} 
                                      on:blur={buscarCep}
                                      maxlength="8"
                                      placeholder="Apenas números" 
                                      class="bg-primary-900 border border-primary-700 rounded-xl p-3 text-primary-50 focus:outline-none focus:border-tertiary-500"
                                  />
                                  {#if erroCep}
                                      <span class="text-red-400 text-[10px]">{erroCep}</span>
                                  {/if}
                              </div>

                              <div class="flex flex-col gap-1.5 sm:col-span-2">
                                  <label for="rua" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Rua / Logradouro</label>
                                  <input 
                                      id="rua"
                                      type="text" 
                                      bind:value={rua} 
                                      placeholder="Preenchido via CEP" 
                                      class="bg-primary-900 border border-primary-700 rounded-xl p-3 text-primary-50 focus:outline-none focus:border-tertiary-500"
                                  />
                              </div>
                          </div>

                          <!-- Linha 2: Número e Complemento -->
                          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div class="flex flex-col gap-1.5">
                                  <label for="numero" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Número</label>
                                  <input 
                                      id="numero"
                                      type="text" 
                                      bind:value={numero} 
                                      placeholder="Ex: 123" 
                                      class="bg-primary-900 border border-primary-700 rounded-xl p-3 text-primary-50 focus:outline-none focus:border-tertiary-500"
                                  />
                              </div>

                              <div class="flex flex-col gap-1.5 sm:col-span-2">
                                  <label for="complemento" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Complemento (Opcional)</label>
                                  <input 
                                      id="complemento"
                                      type="text" 
                                      bind:value={complemento} 
                                      placeholder="Ex: Apto 42, Bloco B" 
                                      class="bg-primary-900 border border-primary-700 rounded-xl p-3 text-primary-50 focus:outline-none focus:border-tertiary-500"
                                  />
                              </div>
                          </div>

                          <!-- Linha 3: Bairro, Cidade e UF -->
                          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div class="flex flex-col gap-1.5">
                                  <label for="bairro" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Bairro</label>
                                  <input 
                                      id="bairro"
                                      type="text" 
                                      bind:value={bairro} 
                                      placeholder="Bairro" 
                                      class="bg-primary-900 border border-primary-700 rounded-xl p-3 text-primary-50 focus:outline-none focus:border-tertiary-500"
                                  />
                              </div>

                              <div class="flex flex-col gap-1.5">
                                  <label for="cidade" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Cidade</label>
                                  <input 
                                      id="cidade"
                                      type="text" 
                                      bind:value={cidade} 
                                      placeholder="Cidade" 
                                      class="bg-primary-900 border border-primary-700 rounded-xl p-3 text-primary-50 focus:outline-none focus:border-tertiary-500"
                                  />
                              </div>

                              <div class="flex flex-col gap-1.5">
                                  <label for="uf" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Estado (UF)</label>
                                  <input 
                                      id="uf"
                                      type="text" 
                                      bind:value={uf} 
                                      maxlength="2"
                                      placeholder="UF" 
                                      class="bg-primary-900 border border-primary-700 rounded-xl p-3 text-primary-50 focus:outline-none focus:border-tertiary-500 uppercase"
                                  />
                              </div>
                          </div>

                          <!-- Forma de Pagamento e Cupom -->
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                              <div class="flex flex-col gap-1.5">
                                  <label for="form_pag" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Forma de Pagamento</label>
                                  <select 
                                      id="form_pag"
                                      bind:value={form_pag} 
                                      class="bg-primary-900 border border-primary-700 rounded-xl p-3 text-primary-50 focus:outline-none focus:border-tertiary-500"
                                  >
                                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                                      <option value="Cartão de Débito">Cartão de Débito</option>
                                      <option value="Pix">Pix</option>
                                      <option value="Dinheiro">Dinheiro</option>
                                  </select>
                              </div>

                              <div class="flex flex-col gap-1.5">
                                  <label for="cupom" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Cupom de Desconto (Opcional)</label>
                                  <input 
                                      id="cupom"
                                      type="text" 
                                      bind:value={cupom} 
                                      placeholder="Ex: SETEVIDAS" 
                                      class="bg-primary-900 border border-primary-700 rounded-xl p-3 text-primary-50 focus:outline-none focus:border-tertiary-500"
                                  />
                              </div>
                          </div>

                          <div class="flex gap-3 pt-2">
                              <button 
                                  on:click={() => mostrandoCheckout = false} 
                                  class="w-1/3 py-3 bg-primary-800 hover:bg-primary-700 text-primary-200 font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
                              >
                                  Voltar
                              </button>
                              <button 
                                  on:click={finalizarPedido} 
                                  disabled={actionLoading} 
                                  class="w-2/3 py-3 bg-tertiary-500 hover:bg-tertiary-600 text-primary-950 font-black rounded-xl uppercase tracking-widest transition-all shadow-md cursor-pointer disabled:opacity-50"
                              >
                                  {actionLoading ? 'Enviando Pedido...' : 'Confirmar e Finalizar'}
                              </button>
                          </div>
                      </div>
                  {/if}

              </div>
          {/if}

      </div>
  {/if}
</main>