<script lang="ts">
    import { onMount } from 'svelte';
    import { Heading, P } from 'flowbite-svelte';
    import Menu from '../../components/Menu.svelte';
    import ModalConfirmacao from '../../components/ConfirmModal.svelte';
  
    interface Gato {
      id: string;
      nome: string;
      idade: number;
      raca: string;
      castracao: boolean;
      personalidade: string;
      adocao: boolean;
      imagem: string | null;
    }
  
    // Definição da estrutura do Usuário igual à do seu Menu
    interface Usuario {
      id: number;
      login: string;
      role: 'admin' | 'user';
    }
  
    // Lista reativa de gatos e estados administrativos
    let gatos: Gato[] = [];
    let modoOpcoes = false; 
  
    // Estados de autenticação locais emparelhados com o seu Menu
    let token = "";
    let user: Usuario | null = null;
    let hasToken = false;
  
    // Modais de Controle de Fluxo
    let exibirModalForm = false;
    let exibirModalExcluir = false;
    let gatoSelecionado: Gato | null = null;
  
    // Campos dos formulários
    let formNome = "";
    let formRaca = "";
    let formIdade = 0;
    let formCastracao = false;
    let formPersonalidade = "";
    let formAdocao = false;
    let motivoExclusaoSelecionado = "";
  
    // Recupera os dados ao montar o componente
    onMount(async () => {
      if (typeof localStorage !== 'undefined') {
        token = localStorage.getItem('token') || "";
        hasToken = !!token;
        
        // Simulação da recuperação do user (geralmente você puxaria do seu AuthStore ou decodificaria o JWT)
        // Substitua pelo seu método global caso use writable stores do Svelte!
        const userRaw = localStorage.getItem('user');
        if (userRaw) {
          user = JSON.parse(userRaw);
        }
      }
      await carregarGatos();
    });
  
    // Requisições assíncronas ao Backend Unificado
    async function carregarGatos() {
      const res = await fetch('/api/gatos');
      const json = await res.json();
      if (json.success) gatos = json.data;
    }
  
    function abrirAdicionar() {
      gatoSelecionado = null;
      formNome = ""; formRaca = ""; formIdade = 0; formCastracao = false; formPersonalidade = ""; formAdocao = false;
      exibirModalForm = true;
    }
  
    function abrirEditar(gato: Gato) {
      gatoSelecionado = gato;
      formNome = gato.nome;
      formRaca = gato.raca;
      formIdade = gato.idade;
      formCastracao = gato.castracao;
      formPersonalidade = gato.personalidade;
      formAdocao = gato.adocao;
      exibirModalForm = true;
    }
  
    function dispararJanelaExclusao(gato: Gato) {
      gatoSelecionado = gato;
      motivoExclusaoSelecionado = "";
      exibirModalExcluir = true; 
    }
  
    async function salvarGato() {
      const payload = { nome: formNome, raca: formRaca, idade: formIdade, castracao: formCastracao, personalidade: formPersonalidade, adocao: formAdocao };
      const url = gatoSelecionado ? `/api/gatos/${gatoSelecionado.id}` : '/api/gatos';
      const method = gatoSelecionado ? 'PUT' : 'POST';
  
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
  
      const json = await res.json();
      if (json.success) {
        exibirModalForm = false;
        carregarGatos();
      }
    }
  
    async function efetuarExclusaoFinal() {
      if (!gatoSelecionado || !motivoExclusaoSelecionado) return;
  
      const res = await fetch(`/api/gatos/${gatoSelecionado.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ motivo: motivoExclusaoSelecionado })
      });
  
      const json = await res.json();
      if (json.success) {
        exibirModalExcluir = false;
        gatoSelecionado = null;
        carregarGatos();
      }
    }
  </script>
  
  <Menu />
  
  <main class="max-w-5xl mx-auto px-6 md:px-12 pt-32 md:pt-40 pb-16 text-neutral-100">
    
    <section class="text-center mb-12">
      <Heading tag="h1" class="text-4xl md:text-6xl font-black tracking-[0.2em] text-white uppercase font-serif">Gatos</Heading>
      <div class="w-20 h-[2px] bg-amber-600 mx-auto mt-6 mb-8"></div>
      
      {#if hasToken && user && user.role === 'admin'}
        <button on:click={() => modoOpcoes = !modoOpcoes} class="px-6 py-2 border border-amber-600 text-amber-500 hover:bg-amber-600 hover:text-white font-medium tracking-wider text-xs uppercase rounded-none transition duration-300">
          {modoOpcoes ? 'Fechar Opções' : 'Opções'}
        </button>
      {/if}
    </section>
  
    {#if hasToken && user && user.role === 'admin' && modoOpcoes}
      <div class="bg-neutral-900 border border-neutral-800 p-6 rounded-none mb-12 flex justify-between items-center">
        <div>
          <h3 class="text-amber-500 font-bold uppercase tracking-wider text-xs font-serif">Painel do Administrador</h3>
          <p class="text-[11px] text-neutral-400 mt-1">Gerenciamento dinâmico da mostra de felinos.</p>
        </div>
        <button on:click={abrirAdicionar} class="bg-amber-600 hover:bg-amber-700 text-white font-bold uppercase tracking-widest text-[10px] py-2.5 px-4 rounded-none transition duration-200">
          Adicionar gatos
        </button>
      </div>
    {/if}
  
    <section class="grid grid-cols-1 md:grid-cols-2 gap-12">
      {#each gatos as gato}
        <div class="bg-neutral-900/40 border border-neutral-800 p-6 rounded-none relative flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-start mb-4">
              <Heading tag="h2" class="text-xl font-bold tracking-[0.15em] text-amber-500 uppercase font-serif">{gato.nome}</Heading>
              {#if gato.adocao}
                <span class="bg-amber-600/10 text-amber-500 text-[10px] tracking-widest font-bold px-2.5 py-1 uppercase border border-amber-600/30">Pra Adoção</span>
              {/if}
            </div>
            
            <div class="text-xs text-neutral-300 space-y-2 tracking-wide">
              <p><span class="text-neutral-500 uppercase font-medium tracking-wider text-[10px]">Raça:</span> {gato.raca}</p>
              <p><span class="text-neutral-500 uppercase font-medium tracking-wider text-[10px]">Idade:</span> {gato.idade} anos</p>
              <p><span class="text-neutral-500 uppercase font-medium tracking-wider text-[10px]">Castração:</span> {gato.castracao ? 'Castrado' : 'Não Castrado'}</p>
              <p class="italic text-neutral-400">"{gato.personalidade}"</p>
            </div>
          </div>
  
          {#if hasToken && user && user.role === 'admin' && modoOpcoes}
            <div class="mt-6 pt-4 border-t border-neutral-800/60 flex gap-4">
              <button on:click={() => abrirEditar(gato)} class="text-[10px] text-amber-500 hover:underline uppercase tracking-widest font-bold">Editar</button>
              <button on:click={() => dispararJanelaExclusao(gato)} class="text-[10px] text-red-500 hover:underline uppercase tracking-widest font-bold ml-auto">Excluir Gato</button>
            </div>
          {/if}
        </div>
      {/each}
    </section>
  
    {#if hasToken && user && user.role === 'admin'}
      
      {#if exibirModalForm}
        <div class="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-neutral-900 border border-neutral-800 rounded-none max-w-md w-full p-6 space-y-4">
            <h3 class="text-sm font-black font-serif text-white uppercase tracking-[0.2em] border-b border-neutral-800/80 pb-3">
              {gatoSelecionado ? 'Editar Gato' : 'Adicionar Gato'}
            </h3>
            <form on:submit|preventDefault={salvarGato} class="space-y-4 text-xs">
              <div>
                <label class="block text-neutral-400 uppercase tracking-wider mb-1">Nome</label>
                <input type="text" bind:value={formNome} required class="w-full bg-neutral-800/50 border border-neutral-700 rounded-none p-2.5 text-white focus:border-amber-500 focus:outline-none" />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-neutral-400 uppercase tracking-wider mb-1">Raça</label>
                  <input type="text" bind:value={formRaca} required class="w-full bg-neutral-800/50 border border-neutral-700 rounded-none p-2.5 text-white focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <label class="block text-neutral-400 uppercase tracking-wider mb-1">Idade (Anos)</label>
                  <input type="number" min="0" bind:value={formIdade} required class="w-full bg-neutral-800/50 border border-neutral-700 rounded-none p-2.5 text-white focus:border-amber-500 focus:outline-none" />
                </div>
              </div>
              <div>
                <label class="block text-neutral-400 uppercase tracking-wider mb-1">Traço de Personalidade</label>
                <textarea bind:value={formPersonalidade} required class="w-full bg-neutral-800/50 border border-neutral-700 rounded-none p-2.5 text-white focus:border-amber-500 focus:outline-none" rows="2"></textarea>
              </div>
              <div class="flex gap-6 pt-2">
                <label class="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input type="checkbox" bind:checked={formCastracao} class="rounded-none bg-neutral-800 border-neutral-700 text-amber-600 focus:ring-0" /> É Castrado
                </label>
                <label class="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input type="checkbox" bind:checked={formAdocao} class="rounded-none bg-neutral-800 border-neutral-700 text-amber-600 focus:ring-0" /> Está pra Adoção
                </label>
              </div>
              <div class="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button type="button" on:click={() => exibirModalForm = false} class="px-4 py-2 uppercase tracking-widest text-[10px] text-neutral-400 font-bold">Cancelar</button>
                <button type="submit" class="bg-amber-600 text-white font-bold uppercase tracking-widest text-[10px] py-2 px-5 rounded-none">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      {/if}
  
      {#if exibirModalExcluir}
        <div class="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-neutral-900 border border-neutral-800 rounded-none max-w-md w-full p-6 space-y-4">
            <h3 class="text-xs font-black font-serif text-red-500 uppercase tracking-[0.2em]">Opções de Exclusão</h3>
            <p class="text-[11px] text-neutral-400 leading-relaxed">Qual o motivo para remover o gato <strong>{gatoSelecionado?.nome}</strong>?</p>
            
            <div class="space-y-2 text-xs">
              {#each ['Adotado', 'Tratamento de Saúde', 'Transferência de Unidade', 'Outros'] as opcao}
                <label class="flex items-center gap-2 p-2.5 bg-neutral-800/40 border border-neutral-800 cursor-pointer hover:bg-neutral-800">
                  <input type="radio" name="motivo" value={opcao} bind:group={motivoExclusaoSelecionado} class="text-amber-600 bg-neutral-700 border-none focus:ring-0" />
                  <span class="text-neutral-300">{opcao}</span>
                </label>
              {/each}
            </div>
  
            <div class="flex justify-end gap-2 pt-2">
              <button on:click={() => { exibirModalExcluir = false; }} class="px-4 py-2 uppercase tracking-widest text-[10px] text-neutral-400 font-bold">Voltar</button>
            </div>
          </div>
        </div>
      {/if}
  
      <ModalConfirmacao 
        open={exibirModalExcluir && motivoExclusaoSelecionado !== ""}
        message={`Confirma a remoção definitiva por motivo de: "${motivoExclusaoSelecionado}"?`}
        confirmText="Confirmar Exclusão"
        cancelText="Cancelar"
        onConfirm={efetuarExclusaoFinal}
        onCancel={() => { motivoExclusaoSelecionado = ""; }}
      />
    {/if}
  
  </main>