<script lang="ts">
  import { Heading } from 'flowbite-svelte';
  import Menu from '../../../components/Menu.svelte';
  import { goto } from "$app/navigation";
  import { getCurrentUser, getToken, type User } from "$lib/auth"; 
  import { onMount } from 'svelte';
  import { slide, fade } from 'svelte/transition';
  import api from '$lib/api';
  
  let user: User | null = null;
  let loading = true;
  let error = '';
  let actionLoading = false;

  let carrinho: any = null;

  // Tipo de Envio
  let tipoEnvio = 'entrega'; // 'entrega' ou 'retirada'

  // Endereços Anteriores e Controle do Modal
  let enderecosSalvos: string[] = [];
  let enderecoSelecionado = '';
  let modalAberto = false;
  let modoNovoEndereco = false; // Alterna para o formulário do ViaCEP dentro ou fora do modal

  // Dados de Endereço (ViaCEP)
  let cep = '';
  let rua = '';
  let numero = '';
  let bairro = '';
  let cidade = '';
  let uf = '';
  let complemento = '';
  let erroCep = '';

  // Dados de Pagamento
  let form_pag = 'Cartão de Crédito';
  let cupom = '';
  let numeroCartao = '';
  let nomeTitular = '';
  let validadeCartao = '';
  let cvvCartao = '';
  let trocoPara = '';

  onMount(async () => {
      const token = getToken();
      if (!token) {
          goto('/login');
          return;
      }

      try {
          user = await getCurrentUser();
          
          // Busca dados do carrinho
          const response = await api.get('/carrinho');
          if (response.data.success) {
              carrinho = response.data.data.carrinho;
          }

          // Busca endereços anteriores do usuário
          try {
              const resEnderecos = await api.get('/pedido/usuario/meus-enderecos');
              if (resEnderecos.data.success) {
                  enderecosSalvos = resEnderecos.data.enderecos;
                  if (enderecosSalvos.length > 0) {
                      enderecoSelecionado = enderecosSalvos[0];
                  }
              }
          } catch (err) {
              console.log('Nenhum endereço anterior encontrado.');
          }

      } catch (e) {
          error = 'Erro ao carregar dados do pedido.';
      } finally {
          loading = false;
      }
  });

  async function buscarCep() {
      const cepLimpo = cep.replace(/\D/g, '');
      if (cepLimpo.length !== 8) return;

      try {
          erroCep = '';
          const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
          const data = await res.json();

          if (data.erro) {
              erroCep = 'CEP não encontrado.';
              return;
          }

          rua = data.logradouro || '';
          bairro = data.bairro || '';
          cidade = data.localidade || '';
          uf = data.uf || '';
      } catch (e) {
          erroCep = 'Erro ao consultar o CEP.';
      }
  }

  async function confirmarNovoEndereco() {
    if (!cep.trim() || !rua.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !uf.trim()) {
        alert('Por favor, preencha todos os campos obrigatórios do endereço.');
        return;
    }
    const novo = `CEP: ${cep}, ${rua}, nº ${numero}${complemento ? ' - ' + complemento : ''}, ${bairro} - ${cidade}/${uf}`;
    
    try {
        // Salva de forma permanente no backend
        await api.post('/pedido/usuario/meus-enderecos', { endereco: novo });

        enderecosSalvos = [novo, ...enderecosSalvos];
        enderecoSelecionado = novo;
        modoNovoEndereco = false;
        modalAberto = false;
    } catch (e) {
        alert('Erro ao salvar o endereço no perfil.');
    }
}

  async function finalizarPedido() {
      let enderecoCompleto = 'Retirada no Local';

      if (tipoEnvio === 'entrega') {
          if (!enderecoSelecionado && enderecosSalvos.length === 0) {
              alert('Por favor, cadastre ou selecione um endereço de entrega.');
              return;
          }
          enderecoCompleto = enderecoSelecionado || `CEP: ${cep}, ${rua}, nº ${numero}, ${bairro} - ${cidade}/${uf}`;
      }

      if ((form_pag === 'Cartão de Crédito' || form_pag === 'Cartão de Débito')) {
          if (!numeroCartao.trim() || !nomeTitular.trim() || !validadeCartao.trim() || !cvvCartao.trim()) {
              alert('Por favor, preencha todos os dados do cartão de pagamento.');
              return;
          }
      }

      let detalhesPagamento = form_pag;
      if (form_pag.includes('Cartão')) {
          const ultimosDigitos = numeroCartao.slice(-4);
          detalhesPagamento = `${form_pag} (Final ${ultimosDigitos})`;
      } else if (form_pag === 'Dinheiro' && trocoPara) {
          detalhesPagamento = `Dinheiro (Troco para: R$ ${trocoPara})`;
      }

      actionLoading = true;

      try {
          const response = await api.post('/pedido', {
              tipo_envio: tipoEnvio,
              endereco: enderecoCompleto,
              form_pag: detalhesPagamento,
              cupom: cupom || null
          });

          alert(response.data.message || 'Pedido realizado com sucesso!');
          goto('/pedido'); 
      } catch (e: any) {
          alert(e.response?.data?.message || 'Erro ao processar o pedido.');
      } finally {
          actionLoading = false;
      }
  }
</script>

<Menu />

<main class="max-w-4xl mx-auto px-4 md:px-8 pt-32 md:pt-40 pb-20 text-primary-50 relative z-30">
  <section class="text-center mb-12 space-y-3">
      <Heading tag="h1" class="text-3xl md:text-5xl font-black tracking-[0.15em] text-primary-50 uppercase font-serif">
          Finalizar Pedido
      </Heading>
      <div class="w-16 h-0.5 bg-tertiary-500 mx-auto"></div>
  </section>

  {#if loading}
      <div class="text-center text-primary-300 font-medium uppercase tracking-widest py-16 text-xs">
          Carregando checkout...
      </div>
  {:else}
      <div class="w-full bg-primary-900/90 backdrop-blur-md border border-primary-800 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col gap-6">
          
          <!-- Resumo rápido do valor -->
          <div class="bg-primary-950/60 p-4 rounded-xl flex justify-between items-center border border-primary-800">
              <span class="text-xs uppercase tracking-wider text-primary-300 font-bold">Total a pagar:</span>
              <span class="text-lg font-black text-tertiary-400">R$ {parseFloat(carrinho?.preco_total || 0).toFixed(2)}</span>
          </div>

          <!-- Formulário de Tipo de Envio -->
          <div class="flex flex-col gap-4 text-xs">
              <h3 class="font-serif font-bold text-tertiary-400 text-sm">Forma de Recebimento</h3>
              
              <div class="grid grid-cols-2 gap-4">
                  <button 
                      type="button" 
                      on:click={() => tipoEnvio = 'entrega'}
                      class={`p-3 rounded-xl border text-center font-bold uppercase transition-all cursor-pointer ${tipoEnvio === 'entrega' ? 'bg-tertiary-500 text-primary-950 border-tertiary-500 shadow-md' : 'bg-primary-950 text-primary-300 border-primary-800'}`}
                  >
                      Delivery (Entrega)
                  </button>
                  <button 
                      type="button" 
                      on:click={() => tipoEnvio = 'retirada'}
                      class={`p-3 rounded-xl border text-center font-bold uppercase transition-all cursor-pointer ${tipoEnvio === 'retirada' ? 'bg-tertiary-500 text-primary-950 border-tertiary-500 shadow-md' : 'bg-primary-950 text-primary-300 border-primary-800'}`}
                  >
                      Retirar no Local
                  </button>
              </div>

              {#if tipoEnvio === 'entrega'}
                  <div transition:slide class="flex flex-col gap-3 pt-2">
                      <h3 class="font-serif font-bold text-tertiary-400 text-sm">Endereço de Entrega</h3>
                      
                      <!-- Bloco Estilo Mercado Livre (Card clicável que abre o Modal) -->
                      <button 
                          type="button"
                          on:click={() => { modalAberto = true; modoNovoEndereco = false; }}
                          class="bg-primary-950 hover:bg-primary-950/80 border border-primary-700 p-4 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer shadow-md"
                      >
                          <div class="flex items-center gap-3">
                              <div class="text-tertiary-400 text-xl">📍</div>
                              <div>
                                  <p class="text-[10px] uppercase tracking-widest text-primary-400 font-bold">Enviar para {user?.login || 'Você'}</p>
                                  <p class="text-xs text-primary-50 font-medium mt-0.5 truncate max-w-md">
                                      {enderecoSelecionado || 'Nenhum endereço selecionado. Clique para escolher.'}
                                  </p>
                              </div>
                          </div>
                          <span class="text-tertiary-400 text-xs font-bold uppercase underline">Alterar</span>
                      </button>
                  </div>
              {/if}

              <h3 class="font-serif font-bold text-tertiary-400 text-sm pt-4">Forma de Pagamento</h3>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1.5">
                      <label for="form_pag" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Método de Pagamento</label>
                      <select id="form_pag" bind:value={form_pag} class="bg-primary-900 border border-primary-700 rounded-xl p-3 text-primary-50 focus:outline-none focus:border-tertiary-500">
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Cartão de Débito">Cartão de Débito</option>
                          <option value="Pix">Pix (Aprovação Imediata)</option>
                          <option value="Dinheiro">Dinheiro na Entrega</option>
                      </select>
                  </div>
                  <div class="flex flex-col gap-1.5">
                      <label for="cupom" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Cupom de Desconto (Opcional)</label>
                      <input id="cupom" type="text" bind:value={cupom} placeholder="Ex: SETEVIDAS" class="bg-primary-900 border border-primary-700 rounded-xl p-3 text-primary-50 focus:outline-none focus:border-tertiary-500" />
                  </div>
              </div>

              {#if form_pag === 'Cartão de Crédito' || form_pag === 'Cartão de Débito'}
                  <div transition:slide class="bg-primary-950 p-4 rounded-xl border border-primary-800 flex flex-col gap-3">
                      <p class="text-[11px] font-bold text-tertiary-400">Insira os dados do {form_pag}:</p>
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div class="sm:col-span-2 flex flex-col gap-1">
                              <label class="text-[9px] uppercase tracking-wider text-primary-400">Número do Cartão</label>
                              <input type="text" bind:value={numeroCartao} maxlength="19" placeholder="0000 0000 0000 0000" class="bg-primary-900 border border-primary-700 rounded-lg p-2.5 text-primary-50 text-xs" />
                          </div>
                          <div class="flex flex-col gap-1">
                              <label class="text-[9px] uppercase tracking-wider text-primary-400">CVV</label>
                              <input type="text" bind:value={cvvCartao} maxlength="4" placeholder="123" class="bg-primary-900 border border-primary-700 rounded-lg p-2.5 text-primary-50 text-xs" />
                          </div>
                      </div>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div class="flex flex-col gap-1">
                              <label class="text-[9px] uppercase tracking-wider text-primary-400">Nome do Titular</label>
                              <input type="text" bind:value={nomeTitular} placeholder="Como está no cartão" class="bg-primary-900 border border-primary-700 rounded-lg p-2.5 text-primary-50 text-xs uppercase" />
                          </div>
                          <div class="flex flex-col gap-1">
                              <label class="text-[9px] uppercase tracking-wider text-primary-400">Validade</label>
                              <input type="text" bind:value={validadeCartao} maxlength="5" placeholder="MM/AA" class="bg-primary-900 border border-primary-700 rounded-lg p-2.5 text-primary-50 text-xs" />
                          </div>
                      </div>
                  </div>
              {/if}

              {#if form_pag === 'Pix'}
                  <div transition:slide class="bg-primary-950 p-4 rounded-xl border border-primary-800 text-primary-300 text-xs flex flex-col gap-1">
                      <p class="font-bold text-tertiary-400">Instruções de Pagamento via Pix:</p>
                      <p>Ao confirmar o pedido, será gerado o QR Code e a chave Pix "Copia e Cola" na próxima tela.</p>
                  </div>
              {/if}

              {#if form_pag === 'Dinheiro'}
                  <div transition:slide class="bg-primary-950 p-4 rounded-xl border border-primary-800 flex flex-col gap-2">
                      <label class="text-[10px] uppercase tracking-wider text-primary-300 font-bold">Precisa de troco para quanto? (Opcional)</label>
                      <input type="text" bind:value={trocoPara} placeholder="Ex: 50.00" class="bg-primary-900 border border-primary-700 rounded-lg p-2.5 text-primary-50 text-xs w-full sm:w-1/3" />
                  </div>
              {/if}

              <div class="flex gap-3 pt-4">
                  <button on:click={() => goto('/carrinho')} class="w-1/3 py-3 bg-primary-800 hover:bg-primary-700 text-primary-200 font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer">
                      Voltar ao Carrinho
                  </button>
                  <button on:click={finalizarPedido} disabled={actionLoading} class="w-2/3 py-3 bg-tertiary-500 hover:bg-tertiary-600 text-primary-950 font-black rounded-xl uppercase tracking-widest transition-all shadow-md cursor-pointer disabled:opacity-50">
                      {actionLoading ? 'Enviando Pedido...' : 'Confirmar e Finalizar'}
                  </button>
              </div>
          </div>
      </div>
  {/if}

  <!-- MODAL DE SELEÇÃO DE ENDEREÇO (Estilo Mercado Livre) -->
  {#if modalAberto}
      <div transition:fade class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-lg p-6 flex flex-col gap-5 shadow-2xl relative text-xs">
              
              <div class="flex justify-between items-center border-b border-primary-800 pb-3">
                  <h3 class="font-serif font-bold text-tertiary-400 text-base">Escolha um endereço de entrega</h3>
                  <button on:click={() => modalAberto = false} class="text-primary-400 hover:text-primary-50 font-bold text-base cursor-pointer">✕</button>
              </div>

              {#if !modoNovoEndereco}
                  <div class="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                      {#if enderecosSalvos.length === 0}
                          <p class="text-primary-300 text-center py-4">Nenhum endereço salvo anteriormente.</p>
                      {:else}
                          {#each enderecosSalvos as end}
                              <label class={`border rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all ${enderecoSelecionado === end ? 'border-tertiary-500 bg-primary-950 shadow-md' : 'border-primary-800 bg-primary-950/40 hover:bg-primary-950/80'}`}>
                                  <input type="radio" name="enderecoModal" value={end} bind:group={enderecoSelecionado} class="mt-0.5 accent-tertiary-500" />
                                  <span class="text-primary-50 font-medium leading-relaxed">{end}</span>
                              </label>
                          {/each}
                      {/if}
                  </div>

                  <div class="flex flex-col gap-3 pt-3 border-t border-primary-800">
                      <button 
                          type="button" 
                          on:click={() => modoNovoEndereco = true}
                          class="w-full py-3 bg-primary-800 hover:bg-primary-700 text-tertiary-400 font-bold rounded-xl uppercase tracking-wider transition-colors cursor-pointer text-center"
                      >
                          + Adicionar novo endereço
                      </button>

                      <button 
                          type="button" 
                          on:click={() => modalAberto = false}
                          class="w-full py-3 bg-tertiary-500 hover:bg-tertiary-600 text-primary-950 font-black rounded-xl uppercase tracking-widest transition-all shadow-md cursor-pointer"
                      >
                          Confirmar
                      </button>
                  </div>
              {:else}
                  <!-- Formulário ViaCEP dentro do Modal -->
                  <div transition:slide class="flex flex-col gap-3 max-h-68 overflow-y-auto pr-1">
                      <p class="text-tertiary-400 font-bold">Novo Endereço (ViaCEP):</p>
                      
                      <div class="grid grid-cols-3 gap-3">
                          <div class="flex flex-col gap-1">
                              <label class="text-[9px] uppercase tracking-widest text-primary-300 font-bold">CEP</label>
                              <input type="text" bind:value={cep} on:blur={buscarCep} maxlength="8" placeholder="Só números" class="bg-primary-950 border border-primary-700 rounded-lg p-2.5 text-primary-50" />
                              {#if erroCep}<span class="text-red-400 text-[9px]">{erroCep}</span>{/if}
                          </div>
                          <div class="col-span-2 flex flex-col gap-1">
                              <label class="text-[9px] uppercase tracking-widest text-primary-300 font-bold">Rua / Logradouro</label>
                              <input type="text" bind:value={rua} placeholder="Rua" class="bg-primary-950 border border-primary-700 rounded-lg p-2.5 text-primary-50" />
                          </div>
                      </div>

                      <div class="grid grid-cols-3 gap-3">
                          <div class="flex flex-col gap-1">
                              <label class="text-[9px] uppercase tracking-widest text-primary-300 font-bold">Número</label>
                              <input type="text" bind:value={numero} placeholder="Ex: 123" class="bg-primary-950 border border-primary-700 rounded-lg p-2.5 text-primary-50" />
                          </div>
                          <div class="col-span-2 flex flex-col gap-1">
                              <label class="text-[9px] uppercase tracking-widest text-primary-300 font-bold">Complemento</label>
                              <input type="text" bind:value={complemento} placeholder="Apto, Bloco..." class="bg-primary-950 border border-primary-700 rounded-lg p-2.5 text-primary-50" />
                          </div>
                      </div>

                      <div class="grid grid-cols-3 gap-3">
                          <div class="flex flex-col gap-1">
                              <label class="text-[9px] uppercase tracking-widest text-primary-300 font-bold">Bairro</label>
                              <input type="text" bind:value={bairro} placeholder="Bairro" class="bg-primary-950 border border-primary-700 rounded-lg p-2.5 text-primary-50" />
                          </div>
                          <div class="flex flex-col gap-1">
                              <label class="text-[9px] uppercase tracking-widest text-primary-300 font-bold">Cidade</label>
                              <input type="text" bind:value={cidade} placeholder="Cidade" class="bg-primary-950 border border-primary-700 rounded-lg p-2.5 text-primary-50" />
                          </div>
                          <div class="flex flex-col gap-1">
                              <label class="text-[9px] uppercase tracking-widest text-primary-300 font-bold">UF</label>
                              <input type="text" bind:value={uf} maxlength="2" placeholder="UF" class="bg-primary-950 border border-primary-700 rounded-lg p-2.5 text-primary-50 uppercase" />
                          </div>
                      </div>
                  </div>

                  <div class="flex gap-3 pt-2 border-t border-primary-800">
                      <button 
                          type="button" 
                          on:click={() => modoNovoEndereco = false}
                          class="w-1/2 py-2.5 bg-primary-800 hover:bg-primary-700 text-primary-200 font-bold rounded-xl uppercase transition-colors cursor-pointer"
                      >
                          Voltar
                      </button>
                      <button 
                          type="button" 
                          on:click={confirmarNovoEndereco}
                          class="w-1/2 py-2.5 bg-tertiary-500 hover:bg-tertiary-600 text-primary-950 font-black rounded-xl uppercase transition-all shadow-md cursor-pointer"
                      >
                          Salvar e Usar
                      </button>
                  </div>
              {/if}

          </div>
      </div>
  {/if}

  <style>
      input:-webkit-autofill,
      input:-webkit-autofill:hover, 
      input:-webkit-autofill:focus, 
      input:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 30px #100C0A inset !important;
        -webkit-text-fill-color: #F5F2EF !important;
        transition: background-color 5000s ease-in-out 0s;
      }
  </style>
</main>