<script lang="ts">
  import { onMount } from 'svelte';
  import { Heading } from 'flowbite-svelte';
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

  interface Usuario {
    id: number;
    login: string;
    role: 'admin' | 'user';
  }

  let gatos: Gato[] = [];
  let modoOpcoes = false; 

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
  let formArquivoImagem: File | null = null; 
  let motivoExclusaoSelecionado = "";

  // Estados para o Modal de Adoção Fake (WhatsApp)
  let exibirModalAdocao = false;
  let gatoParaAdocao: Gato | null = null;
  let mensagemAdocao = "";
  let adocaoEnviada = false;

  import { getCurrentUser, getToken, type User } from "$lib/auth";
  import { page } from "$app/stores";

  let user: User | null = null;
  let hasToken = false;
  let loadingUser = false;
  let authRequestId = 0;

  async function updateAuthStatus() {
    hasToken = getToken() !== null;
    if (!hasToken) { user = null; loadingUser = false; return; }
    if (user || loadingUser) return;

    loadingUser = true;
    const requestId = ++authRequestId;

    try {
      const userData = await getCurrentUser();
      if (requestId !== authRequestId) return;
      user = userData;
      hasToken = userData !== null;
    } catch {
      if (requestId !== authRequestId) return;
      user = null;
      hasToken = false;
    } finally {
      if (requestId === authRequestId) loadingUser = false;
    }
  }

  $: if ($page.url.pathname) { void updateAuthStatus(); }

  onMount(async () => {
    void updateAuthStatus();
    await carregarGatos();
  });

  function abrirAdicionar() {
    gatoSelecionado = null;
    formNome = ""; formRaca = ""; formIdade = 0; formCastracao = false; formPersonalidade = ""; formAdocao = false;
    formArquivoImagem = null;
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
    formArquivoImagem = null;
    exibirModalForm = true;
  }

  function dispararJanelaExclusao(gato: Gato) {
    gatoSelecionado = gato;
    motivoExclusaoSelecionado = "";
    exibirModalExcluir = true; 
  }

  function abrirModalAdocao(gato: Gato) {
    gatoParaAdocao = gato;
    mensagemAdocao = "";
    adocaoEnviada = false;
    exibirModalAdocao = true;
  }

  const API_URL = 'http://localhost:3000'; 

  async function carregarGatos() {
    const res = await fetch(`${API_URL}/api/gatos`);
    const json = await res.json();
    if (json.success) gatos = json.data;
  }

  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      formArquivoImagem = target.files[0];
    }
  }

  async function simularEnvioAdocao() {
    if (!mensagemAdocao.trim() || !gatoParaAdocao) return;

    try {
      const res = await fetch(`${API_URL}/api/gatos/${gatoParaAdocao.id}/adotar`, {
        method: 'PUT', // <-- Certifique-se de que está 'PUT' aqui
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ mensagem: mensagemAdocao })
      });

      const json = await res.json();
      if (json.success) {
        adocaoEnviada = true;
        setTimeout(() => {
          exibirModalAdocao = false;
          gatoParaAdocao = null;
          carregarGatos();
        }, 2000);
      } else {
        alert(json.message || 'Erro ao processar adoção.');
      }
    } catch (error) {
      console.error('Erro na requisição de adoção:', error);
    }
  }

  async function salvarGato() {
    const formData = new FormData();
    formData.append('nome', formNome);
    formData.append('raca', formRaca);
    formData.append('idade', String(formIdade));
    formData.append('castracao', String(formCastracao));
    formData.append('personalidade', formPersonalidade);
    formData.append('adocao', String(formAdocao));
    
    if (formArquivoImagem) {
      formData.append('imagem', formArquivoImagem);
    }

    const url = gatoSelecionado ? `${API_URL}/api/gatos/${gatoSelecionado.id}` : `${API_URL}/api/gatos`;
    const method = gatoSelecionado ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    });

    const json = await res.json();
    if (json.success) {
      exibirModalForm = false;
      carregarGatos();
    }
  }

  async function efetuarExclusaoFinal() {
    if (!gatoSelecionado || !motivoExclusaoSelecionado) return;

    const res = await fetch(`${API_URL}/api/gatos/${gatoSelecionado.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
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

<main class="max-w-6xl mx-auto px-6 md:px-12 pt-32 md:pt-40 pb-20 text-primary-50">

  <section class="text-center mb-16">
    <Heading tag="h1" class="text-4xl md:text-6xl font-black tracking-[0.2em] text-white uppercase font-serif">Gatos</Heading>
    <div class="w-24 h-[2px] bg-tertiary-500 mx-auto mt-6 mb-8"></div>
    
    {#if hasToken && user && user.role === 'admin'}
      <button on:click={() => modoOpcoes = !modoOpcoes} class="px-6 py-2.5 border border-tertiary-500 text-tertiary-400 hover:bg-tertiary-500 hover:text-primary-950 font-bold tracking-wider text-xs uppercase transition duration-300 shadow-sm">
        {modoOpcoes ? 'Fechar Painel' : 'Painel Administrativo'}
      </button>
    {/if}
  </section>

  {#if hasToken && user && user.role === 'admin' && modoOpcoes}
    <div class="bg-primary-900/90 border border-primary-700/60 p-6 mb-16 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
      <div>
        <h3 class="text-tertiary-400 font-bold uppercase tracking-wider text-xs font-serif">Modo de Gerenciamento</h3>
        <p class="text-[11px] text-primary-300 mt-1">Adicione, edite ou remova felinos do catálogo com controle total.</p>
      </div>
      <button on:click={abrirAdicionar} class="bg-tertiary-600 hover:bg-tertiary-500 text-primary-950 font-black uppercase tracking-widest text-[11px] py-3 px-6 transition duration-200 shadow-md">
        + Adicionar Gato
      </button>
    </div>
  {/if}

  <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    {#each gatos.filter(g => (user && user.role === 'admin') || g.adocao) as gato}
      <div class="bg-primary-900/40 border border-primary-800/80 p-5 flex flex-col justify-between shadow-lg hover:border-tertiary-600/50 transition duration-300 group">
        <div>
          <!-- Foto do Gato com Tag de Status em cima -->
          <div class="mb-5 w-full h-56 overflow-hidden bg-primary-950 border border-primary-800 relative">
            {#if gato.imagem}
              <img src={`${API_URL}${gato.imagem}`} alt={gato.nome} class="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
            {:else}
              <div class="w-full h-full flex items-center justify-center text-primary-600 text-xs italic">Sem foto</div>
            {/if}
            
            <!-- Badge de Adoção dinâmica sobre a foto -->
            <div class="absolute top-3 right-3">
              {#if gato.adocao}
                <span class="bg-tertiary-600/90 text-primary-950 text-[10px] tracking-widest font-black px-3 py-1 uppercase shadow-md border border-tertiary-400/30">
                  Disponível para Adoção
                </span>
              {:else}
                <span class="bg-primary-950/80 text-primary-300 text-[10px] tracking-widest font-bold px-3 py-1 uppercase shadow-md border border-primary-800">
                  Não está para adoção
                </span>
              {/if}
            </div>
          </div>

          <div class="mb-3">
            <Heading tag="h2" class="text-xl font-bold tracking-[0.1em] text-tertiary-400 uppercase font-serif">{gato.nome}</Heading>
          </div>
          
          <div class="text-xs text-primary-200 space-y-2 tracking-wide border-t border-primary-800/60 pt-3">
            <p class="flex justify-between"><span class="text-primary-400 uppercase font-semibold text-[10px]">Raça:</span> <span class="font-medium text-white">{gato.raca}</span></p>
            <p class="flex justify-between"><span class="text-primary-400 uppercase font-semibold text-[10px]">Idade:</span> <span class="font-medium text-white">{gato.idade} anos</span></p>
            <p class="flex justify-between"><span class="text-primary-400 uppercase font-semibold text-[10px]">Castração:</span> <span class="font-medium text-white">{gato.castracao ? 'Castrado' : 'Não Castrado'}</span></p>
            <div class="pt-2">
              <p class="text-[11px] text-primary-300 italic bg-primary-950/40 p-2.5 border-l-2 border-tertiary-600">"{gato.personalidade}"</p>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-3 border-t border-primary-800 flex flex-col gap-2">
          <!-- Botão de Adoção Fake (WhatsApp) - Disponível para usuários logados se o gato estiver para adoção -->
          {#if gato.adocao && hasToken && user}
            <button 
              on:click={() => abrirModalAdocao(gato)}
              class="w-full bg-tertiary-600/20 hover:bg-tertiary-600 text-tertiary-300 hover:text-primary-950 border border-tertiary-500/40 font-bold uppercase tracking-wider text-[10px] py-2.5 px-4 transition duration-300 flex items-center justify-center gap-2 shadow-sm"
            >
              💬 Conversar sobre Adoção (WhatsApp)
            </button>
          {/if}

          {#if hasToken && user && user.role === 'admin' && modoOpcoes}
            <div class="flex gap-4 pt-2">
              <button on:click={() => abrirEditar(gato)} class="text-[10px] text-tertiary-400 hover:text-tertiary-300 uppercase tracking-widest font-bold transition">Editar</button>
              <button on:click={() => dispararJanelaExclusao(gato)} class="text-[10px] text-red-400 hover:text-red-300 uppercase tracking-widest font-bold ml-auto transition">Excluir</button>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </section>

  <!-- Modal Falso de WhatsApp para Adoção -->
  {#if exibirModalAdocao && gatoParaAdocao}
    <div class="fixed inset-0 bg-primary-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div class="bg-primary-900 border border-primary-700 max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        
        <div class="bg-[#1f1612] px-4 py-3 flex items-center justify-between border-b border-amber-900/40">
          <div class="flex items-center gap-3">
            <div class="relative">
              <div class="w-9 h-9 rounded-full bg-tertiary-600 flex items-center justify-center text-primary-950 font-bold text-sm">
                🐈
              </div>
              <span class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#1f1612] rounded-full"></span>
            </div>
            <div>
              <h4 class="text-white font-semibold text-xs">Sete Vidas Café (Adoção)</h4>
              <p class="text-[10px] text-tertiary-400">online (plantão felino)</p>
            </div>
          </div>
          <button on:click={() => exibirModalAdocao = false} class="text-primary-300 hover:text-white font-bold text-sm px-2">
            ✕
          </button>
        </div>

        <div class="bg-[#0b0807] p-4 h-60 overflow-y-auto flex flex-col gap-3 text-xs">
          <div class="self-start bg-[#1f1612] text-primary-50 p-3 rounded-2xl rounded-tl-sm max-w-[85%] border border-primary-800 shadow-sm">
            <p>Olá! 🐾 Demonstrou interesse no(a) gatinho(a) <strong>{gatoParaAdocao.nome}</strong> ({gatoParaAdocao.raca}, {gatoParaAdocao.idade} anos).</p>
          </div>

          <div class="self-start bg-[#1f1612] text-primary-50 p-3 rounded-2xl rounded-tl-sm max-w-[85%] border border-primary-800 shadow-sm">
            <p>Diga o porquê de você querer adotar esse serumaninho para o sistema registrar:</p>
          </div>

          {#if adocaoEnviada}
            <div class="self-end bg-[#005c4b] text-white p-3 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
              <p>{mensagemAdocao}</p>
              <div class="flex items-center justify-end gap-1 mt-1">
                <span class="text-[9px] text-emerald-200">12:16</span>
                <span class="text-sky-400 text-[10px]">✓✓</span>
              </div>
            </div>

            <div class="self-start bg-[#1f1612] text-primary-50 p-3 rounded-2xl rounded-tl-sm max-w-[85%] border border-primary-800 shadow-sm animate-pulse">
              <p>🎉 <strong>Adoção concluída!</strong> O gatinho foi adotado e vinculado a sua conta.</p>
            </div>
          {/if}
        </div>

        <div class="bg-[#1f1612] p-3 flex items-center gap-2 border-t border-amber-900/40">
          <input 
            type="text" 
            bind:value={mensagemAdocao}
            placeholder={adocaoEnviada ? "Processo concluído!" : "Digite sua mensagem..."}
            disabled={adocaoEnviada}
            on:keydown={(e) => e.key === 'Enter' && simularEnvioAdocao()}
            class="flex-1 bg-primary-950 border border-primary-700 text-white placeholder-primary-500 text-xs rounded-full px-3 py-2 focus:outline-none focus:border-tertiary-500"
          />
          <button 
            on:click={simularEnvioAdocao}
            disabled={adocaoEnviada}
            class="bg-tertiary-600 hover:bg-tertiary-500 disabled:opacity-50 text-primary-950 px-3 py-2 rounded-full transition-all flex items-center justify-center font-bold text-xs"
          >
            Enviar
          </button>
        </div>

      </div>
    </div>
  {/if}

  {#if hasToken && user && user.role === 'admin'}
    
    {#if exibirModalForm}
      <div class="fixed inset-0 bg-primary-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div class="bg-primary-900 border border-primary-700 max-w-lg w-full p-8 space-y-6 shadow-2xl">
          <div class="border-b border-primary-800 pb-4">
            <h3 class="text-sm font-black font-serif text-white uppercase tracking-[0.2em]">
              {gatoSelecionado ? 'Editar Ficha do Gato' : 'Adicionar Novo Gato'}
            </h3>
          </div>

          <form on:submit|preventDefault={salvarGato} class="space-y-4 text-xs">
            <div>
              <label class="block text-primary-300 uppercase tracking-wider mb-1.5 font-semibold">Nome</label>
              <input type="text" bind:value={formNome} required class="w-full bg-primary-950/80 border border-primary-700 p-3 text-white focus:border-tertiary-500 focus:outline-none shadow-inner" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-primary-300 uppercase tracking-wider mb-1.5 font-semibold">Raça</label>
                <input type="text" bind:value={formRaca} required class="w-full bg-primary-950/80 border border-primary-700 p-3 text-white focus:border-tertiary-500 focus:outline-none shadow-inner" />
              </div>
              <div>
                <label class="block text-primary-300 uppercase tracking-wider mb-1.5 font-semibold">Idade (Anos)</label>
                <input type="number" min="0" bind:value={formIdade} required class="w-full bg-primary-950/80 border border-primary-700 p-3 text-white focus:border-tertiary-500 focus:outline-none shadow-inner" />
              </div>
            </div>

            <div>
              <label class="block text-primary-300 uppercase tracking-wider mb-1.5 font-semibold">Foto do Gato</label>
              <input type="file" accept="image/*" on:change={handleFileChange} class="w-full bg-primary-950/80 border border-primary-700 p-2 text-white text-xs file:mr-4 file:py-1.5 file:px-3 file:border-0 file:text-xs file:font-bold file:bg-tertiary-600 file:text-primary-950 hover:file:bg-tertiary-500 cursor-pointer" />
            </div>

            <div>
              <label class="block text-primary-300 uppercase tracking-wider mb-1.5 font-semibold">Traço de Personalidade</label>
              <textarea bind:value={formPersonalidade} required class="w-full bg-primary-950/80 border border-primary-700 p-3 text-white focus:border-tertiary-500 focus:outline-none shadow-inner" rows="3"></textarea>
            </div>

            <div class="flex flex-col sm:flex-row gap-6 pt-2 bg-primary-950/40 p-4 border border-primary-800">
              <label class="flex items-center gap-3 cursor-pointer text-primary-200">
                <input type="checkbox" bind:checked={formCastracao} class="w-4 h-4 bg-primary-950 border-primary-700 text-tertiary-600 focus:ring-0" /> Castrado(a)
              </label>
              <label class="flex items-center gap-3 cursor-pointer text-primary-200">
                <input type="checkbox" bind:checked={formAdocao} class="w-4 h-4 bg-primary-950 border-primary-700 text-tertiary-600 focus:ring-0" /> Disponível para Adoção
              </label>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t border-primary-800">
              <button type="button" on:click={() => exibirModalForm = false} class="px-5 py-2.5 uppercase tracking-widest text-[10px] text-primary-400 hover:text-white font-bold transition">Cancelar</button>
              <button type="submit" class="bg-tertiary-600 hover:bg-tertiary-500 text-primary-950 font-black uppercase tracking-widest text-[10px] py-2.5 px-6 shadow-md transition">Salvar Gato</button>
            </div>
          </form>
        </div>
      </div>
    {/if}

    {#if exibirModalExcluir}
      <div class="fixed inset-0 bg-primary-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div class="bg-primary-900 border border-primary-700 max-w-md w-full p-8 space-y-5 shadow-2xl">
          <div class="border-b border-primary-800 pb-3">
            <h3 class="text-xs font-black font-serif text-red-400 uppercase tracking-[0.2em]">Opções de Exclusão</h3>
          </div>
          <p class="text-xs text-primary-300 leading-relaxed">Qual o motivo para remover o registro de <strong>{gatoSelecionado?.nome}</strong>?</p>
          
          <div class="space-y-2.5 text-xs">
            {#each ['Adotado', 'Tratamento de Saúde', 'Transferência de Unidade', 'Outros'] as opcao}
              <label class="flex items-center gap-3 p-3 bg-primary-950/60 border border-primary-800 cursor-pointer hover:border-tertiary-600 transition">
                <input type="radio" name="motivo" value={opcao} bind:group={motivoExclusaoSelecionado} class="text-tertiary-600 bg-primary-900 border-primary-700 focus:ring-0" />
                <span class="text-primary-200 font-medium">{opcao}</span>
              </label>
            {/each}
          </div>

          <div class="flex justify-end pt-2">
            <button on:click={() => { exibirModalExcluir = false; }} class="px-5 py-2 uppercase tracking-widest text-[10px] text-primary-400 hover:text-white font-bold transition">Voltar</button>
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