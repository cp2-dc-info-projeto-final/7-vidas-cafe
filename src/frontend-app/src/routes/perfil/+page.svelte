<script lang="ts">
  import { Heading, Badge } from 'flowbite-svelte';
  import Menu from '../../components/Menu.svelte';
  import { goto } from "$app/navigation";
  import { getCurrentUser, getToken, removeToken, type User } from "$lib/auth"; 
  import { onMount } from 'svelte';

  let user: User | null = null;
  let loading = true;
  let error = '';

  let confirmPassword = '';
  let showDeleteConfirmation = false;
  
  // Controle do modal de alteração de senha
  let showPasswordModal = false;

  let editingField: string | null = null;
  let editValue: string = '';
  let saveLoading = false;

  const hoje = new Date();
  const dataLimite16Anos = new Date(hoje.getFullYear() - 16, hoje.getMonth(), hoje.getDate())
    .toISOString()
    .split('T')[0];

  onMount(async () => {
    await loadUserData();
  });

  async function loadUserData() {
    const token = getToken();
    if (!token) {
      error = 'Usuário não autenticado.';
      loading = false;
      goto('/login');
      return;
    }

    try {
      const userData = await getCurrentUser();
      if (userData) {
        user = userData;
      } else {
        error = 'Não foi possível carregar os dados do perfil.';
      }
    } catch (e) {
      console.error('Erro ao buscar o usuário logado:', e);
      error = 'Erro ao carregar as informações.';
    } finally {
      loading = false;
    }
  }

  function startEdit(field: string, initialValue: any) {
    editingField = field;
    error = '';
    if (field === 'dat_nas' && initialValue) {
      editValue = new Date(initialValue).toISOString().split('T')[0];
    } else if (field === 'password') {
      editValue = ''; 
    } else {
      editValue = initialValue || '';
    }
  }

  function cancelEdit() {
    editingField = null;
    editValue = '';
    error = '';
    showPasswordModal = false;
  }

  // Modificado para aceitar um parâmetro que força a gravação pós-confirmação
  async function saveField(field: string, bypassModal = false) {
    if (!user) return;
    saveLoading = true;
    error = '';

    const valorLimpo = editValue.trim();

    if (!valorLimpo) {
      error = 'Este campo é obrigatório e não pode ficar vazio.';
      saveLoading = false;
      return;
    }

    // Validações...
    if (field === 'email') {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|hotmail|outlook|yahoo|icloud|live)\.(com|com\.br)$/i;
      if (!emailRegex.test(valorLimpo)) {
        error = 'Por favor, insira um e-mail válido dos provedores aceitos (Ex: nome@gmail.com, nome@outlook.com).';
        saveLoading = false;
        return;
      }
    }

    if (field === 'login' && valorLimpo.length < 3) {
      error = 'O nome de usuário deve conter pelo menos 3 caracteres.';
      saveLoading = false;
      return;
    }

    if (field === 'password' && valorLimpo.length < 6) {
      error = 'A nova senha deve conter pelo menos 6 caracteres.';
      saveLoading = false;
      return;
    }

    // Intercepta aqui: Se for senha e ainda não foi confirmado no modal, abre o modal
    if (field === 'password' && !bypassModal) {
      saveLoading = false;
      showPasswordModal = true;
      return; // Para a execução e espera o usuário clicar em "Confirmar" no modal
    }

    if (field === 'dat_nas') {
      const dataSelecionada = new Date(valorLimpo);
      const dataMinima = new Date('1900-01-01');
      const dataAtual = new Date();

      if (dataSelecionada < dataMinima) {
        error = 'A data de nascimento não pode ser anterior a 01/01/1900.';
        saveLoading = false;
        return;
      }

      let idade = dataAtual.getFullYear() - dataSelecionada.getFullYear();
      const mes = dataAtual.getMonth() - dataSelecionada.getMonth();
      if (mes < 0 || (mes === 0 && dataAtual.getDate() < dataSelecionada.getDate())) {
        idade--;
      }

      if (idade < 16) {
        error = 'Cadastro permitido apenas para maiores de 16 anos.';
        saveLoading = false;
        return;
      }
    }

    if (field === 'cpf') {
      const cpfRegex = /^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/;
      if (!cpfRegex.test(valorLimpo)) {
        error = 'Formato de CPF inválido. Use o padrão puro (12345678900) ou formatado (123.456.789-00).';
        saveLoading = false;
        return;
      }
    }

    if (field === 'num_tel') {
      const telRegex = /^\((1[1-9]|[2-9][1-9])\)(9[2-9]\d{3}|[2-5]\d{3})-\d{4}$/;
      if (!telRegex.test(valorLimpo)) {
        const digitos = valorLimpo.replace(/\D/g, '');
        
        if (digitos.length < 10 || digitos.length > 11) {
          error = 'Telefone incompleto ou longo demais. Deve ter 10 dígitos (fixo) ou 11 dígitos (celular) com o DDD.';
        } else if (digitos.length === 11 && digitos[2] !== '9') {
          error = 'Todo número de celular com 9 dígitos deve obrigatoriamente começar com o número 9 após o DDD. Ex: (21)9XXXX-XXXX';
        } else {
          error = 'Formato de telefone incorreto. Use o padrão estruturado: (21)92345-6789.';
        }
        saveLoading = false;
        return;
      }
    }

    const updatedData: any = {
      login: field === 'login' ? valorLimpo : user.login,
      email: field === 'email' ? valorLimpo : user.email,
      cpf: field === 'cpf' ? valorLimpo : user.cpf,
      dat_nas: field === 'dat_nas' ? valorLimpo : user.dat_nas,
      num_tel: field === 'num_tel' ? valorLimpo : user.num_tel,
      role: user.role
    };

    if (field === 'password') {
      updatedData.password = valorLimpo;
    }

    try {
      const response = await fetch(`http://localhost:3000/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(updatedData)
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errors && result.errors.length > 0) {
          throw new Error(result.errors[0].message);
        }
        throw new Error(result.message || 'Erro ao atualizar dados.');
      }

      await loadUserData();
      editingField = null;
      showPasswordModal = false; // Fecha o modal após o sucesso
    } catch (e: any) {
      console.error(e);
      error = e.message || 'Falha ao salvar alteração.';
    } finally {
      saveLoading = false;
    }
  }

  // Função chamada pelo botão de dentro do Modal
  function confirmSavePassword() {
    saveField('password', true);
  }

  async function deleteOwnAccount() {
    if (!user) return;
    if (!confirmPassword) {
      error = 'Por favor, digite sua senha para confirmar.';
      return;
    }

    saveLoading = true;
    error = '';

    try {
      const response = await fetch(`http://localhost:3000/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ password: confirmPassword }) 
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao excluir a conta.');
      }

      removeToken(); 
      goto('/login');
    } catch (e: any) {
      console.error(e);
      error = e.message || 'Falha ao excluir a conta.';
    } finally {
      saveLoading = false;
    }
  }
</script>

<Menu />

{#if loading}
  <div class="my-32 text-center text-neutral-400 font-medium uppercase tracking-widest animate-pulse">Carregando informações do perfil...</div>
{:else}
  <div class="mt-30 w-full max-w-2xl mx-auto px-4 pt-24 pb-16 relative z-30">
    <div class="bg-primary-350/80 backdrop-blur-lg border border-primary-350 rounded-none shadow-2xl p-5 sm:p-8 flex flex-col gap-6">
      
      <div class="flex items-center justify-between border-b border-neutral-800/40 pb-4 mb-2 gap-2">
        <h2 class="text-lg sm:text-xl font-black tracking-[0.15em] text-secondary-600 uppercase font-serif">Informações do Perfil</h2>
        <Badge class="bg-neutral-950 text-amber-500 border border-neutral-800 rounded-none text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 shrink-0">
          {user?.role}
        </Badge>
      </div>

      {#if error}
        <div class="text-xs font-semibold tracking-wide text-red-400 bg-red-950/30 p-3 rounded-none border border-red-900/40">{error}</div>
      {/if}

      {#if user}
        <!-- USUÁRIO -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-6">
          <div class="w-full sm:w-1/4 sm:text-right text-[10px] font-bold uppercase tracking-widest text-primary-900">
            Usuário
          </div>
          <div class="w-full sm:w-3/4 flex flex-col sm:flex-row gap-2">
            {#if editingField === 'login'}
              <input type="text" bind:value={editValue} disabled={saveLoading} class="w-full text-neutral-900 bg-tertiary-100 border border-black rounded-none p-2 text-xs focus:outline-none focus:border-amber-600" />
              <div class="flex gap-2 w-full sm:w-auto shrink-0">
                <button on:click={() => saveField('login')} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2 bg-transparent border border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-neutral-950 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Salvar</button>
                <button on:click={cancelEdit} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Sair</button>
              </div>
            {:else}
              <div class="w-full text-neutral-900 bg-tertiary-100 border border-black rounded-none p-2 text-xs font-medium min-h-[34px] flex items-center">
                {user.login}
              </div>
              <button on:click={() => startEdit('login', user.login)} class="w-full sm:w-auto shrink-0 px-4 py-2 bg-transparent border border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-neutral-950 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Editar</button>
            {/if}
          </div>
        </div>

        <!-- E-MAIL -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-6">
          <div class="w-full sm:w-1/4 sm:text-right text-[10px] font-bold uppercase tracking-widest text-primary-900">
            E-mail
          </div>
          <div class="w-full sm:w-3/4 flex flex-col sm:flex-row gap-2">
            {#if editingField === 'email'}
              <input type="email" bind:value={editValue} disabled={saveLoading} class="w-full text-neutral-900 bg-tertiary-100 border border-black rounded-none p-2 text-xs focus:outline-none focus:border-amber-600" />
              <div class="flex gap-2 w-full sm:w-auto shrink-0">
                <button on:click={() => saveField('email')} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2 bg-transparent border border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-neutral-950 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Salvar</button>
                <button on:click={cancelEdit} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Sair</button>
              </div>
            {:else}
              <div class="w-full text-neutral-900 bg-tertiary-100 border border-black rounded-none p-2 text-xs min-h-[34px] flex items-center break-all">
                {user.email}
              </div>
              <button on:click={() => startEdit('email', user.email)} class="w-full sm:w-auto shrink-0 px-4 py-2 bg-transparent border border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-neutral-950 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Editar</button>
            {/if}
          </div>
        </div>

        <!-- ALTERAR SENHA -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-6">
          <div class="w-full sm:w-1/4 sm:text-right text-[10px] font-bold uppercase tracking-widest text-primary-900">
            Senha
          </div>
          <div class="w-full sm:w-3/4 flex flex-col sm:flex-row gap-2">
            {#if editingField === 'password'}
              <input type="password" placeholder="Digite a nova senha" bind:value={editValue} disabled={saveLoading} class="w-full text-neutral-900 bg-tertiary-100 border border-black rounded-none p-2 text-xs focus:outline-none focus:border-amber-600" />
              <div class="flex gap-2 w-full sm:w-auto shrink-0">
                <button on:click={() => saveField('password')} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2 bg-transparent border border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-neutral-950 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Salvar</button>
                <button on:click={cancelEdit} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Sair</button>
              </div>
            {:else}
              <div class="w-full text-neutral-900 bg-tertiary-100 border border-black rounded-none p-2 text-xs min-h-[34px] flex items-center select-none text-neutral-400">
                ********
              </div>
              <button on:click={() => startEdit('password', '')} class="w-full sm:w-auto shrink-0 px-4 py-2 bg-transparent border border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-neutral-950 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Editar</button>
            {/if}
          </div>
        </div>

        <!-- CPF -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-6">
          <div class="w-full sm:w-1/4 sm:text-right text-[10px] font-bold uppercase tracking-widest text-primary-900">
            CPF
          </div>
          <div class="w-full sm:w-3/4 flex flex-col sm:flex-row gap-2">
            {#if editingField === 'cpf'}
              <input type="text" bind:value={editValue} placeholder="123.456.789-00" disabled={saveLoading} class="w-full text-neutral-900 bg-tertiary-100 border border-black rounded-none p-2 text-xs focus:outline-none focus:border-amber-600" />
              <div class="flex gap-2 w-full sm:w-auto shrink-0">
                <button on:click={() => saveField('cpf')} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2 bg-transparent border border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-neutral-950 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Salvar</button>
                <button on:click={cancelEdit} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Sair</button>
              </div>
            {:else}
              <div class="w-full text-neutral-900 bg-tertiary-100 border border-black rounded-none p-2 text-xs min-h-[34px] flex items-center">
                {user.cpf}
              </div>
              <button on:click={() => startEdit('cpf', user.cpf)} class="w-full sm:w-auto shrink-0 px-4 py-2 bg-transparent border border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-neutral-950 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Editar</button>
            {/if}
          </div>
        </div>

        <!-- NASCIMENTO -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-6">
          <div class="w-full sm:w-1/4 sm:text-right text-[10px] font-bold uppercase tracking-widest text-primary-900">
            Nascimento
          </div>
          <div class="w-full sm:w-3/4 flex flex-col sm:flex-row gap-2">
            {#if editingField === 'dat_nas'}
              <input type="date" min="1900-01-01" max={dataLimite16Anos} bind:value={editValue} disabled={saveLoading} class="w-full text-neutral-900 bg-tertiary-100 border border-black rounded-none p-2 text-xs focus:outline-none focus:border-amber-600" />
              <div class="flex gap-2 w-full sm:w-auto shrink-0">
                <button on:click={() => saveField('dat_nas')} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2 bg-transparent border border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-neutral-950 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Salvar</button>
                <button on:click={cancelEdit} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Sair</button>
              </div>
            {:else}
              <div class="w-full text-neutral-900 bg-tertiary-100 border border-black rounded-none p-2 text-xs min-h-[34px] flex items-center">
                {user.dat_nas ? new Date(user.dat_nas).toLocaleDateString('pt-BR') : 'Não informada'}
              </div>
              <button on:click={() => startEdit('dat_nas', user.dat_nas)} class="w-full sm:w-auto shrink-0 px-4 py-2 bg-transparent border border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-neutral-950 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Editar</button>
            {/if}
          </div>
        </div>

        <!-- TELEFONE -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-6">
          <div class="w-full sm:w-1/4 sm:text-right text-[10px] font-bold uppercase tracking-widest text-primary-900">
            Telefone
          </div>
          <div class="w-full sm:w-3/4 flex flex-col sm:flex-row gap-2">
            {#if editingField === 'num_tel'}
              <input type="text" placeholder="(21)92345-6789" bind:value={editValue} disabled={saveLoading} class="w-full text-neutral-900 bg-tertiary-100 border border-black rounded-none p-2 text-xs focus:outline-none focus:border-amber-600" />
              <div class="flex gap-2 w-full sm:w-auto shrink-0">
                <button on:click={() => saveField('num_tel')} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2 bg-transparent border border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-neutral-950 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Salvar</button>
                <button on:click={cancelEdit} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Sair</button>
              </div>
            {:else}
              <div class="w-full text-neutral-900 bg-tertiary-100 border border-black rounded-none p-2 text-xs min-h-[34px] flex items-center">
                {user.num_tel || 'Não informado'}
              </div>
              <button on:click={() => startEdit('num_tel', user.num_tel)} class="w-full sm:w-auto shrink-0 px-4 py-2 bg-transparent border border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-neutral-950 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Editar</button>
            {/if}
          </div>
        </div>

        <!-- ZONA DE PERIGO -->
        <div class="mt-3 pt-6 border-t border-neutral-800/40 bg-neutral-950/40 p-4 sm:p-5 rounded-none flex flex-col gap-4">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 class="text-xs font-black text-red-500 uppercase tracking-[0.2em]">Zona de Perigo</h3>
              <p class="text-[11px] text-neutral-400 mt-1 font-light tracking-wide leading-relaxed">Ao excluir sua conta, todos os seus dados serão apagados permanentemente.</p>
            </div>
            {#if !showDeleteConfirmation}
              <button on:click={() => { showDeleteConfirmation = true; error = ''; }} class="w-full md:w-auto shrink-0 px-4 py-2.5 bg-red-950/40 hover:bg-red-900/30 border border-red-900/50 text-red-400 rounded-none text-[10px] font-bold uppercase tracking-widest transition-all duration-300">Excluir conta</button>
            {/if}
          </div>

          {#if showDeleteConfirmation}
            <div class="mt-2 p-3 sm:p-4 bg-neutral-950/80 border border-red-900/30 rounded-none flex flex-col gap-3">
              <label for="confirm-pass" class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Para confirmar a exclusão, digite sua senha:</label>
              <div class="flex flex-col sm:flex-row gap-2">
                <input id="confirm-pass" type="password" placeholder="Sua senha atual" bind:value={confirmPassword} disabled={saveLoading} class="w-full text-neutral-900 bg-tertiary-100 border border-black rounded-none p-2 text-xs focus:outline-none focus:border-red-500" />
                <div class="flex gap-2 w-full sm:w-auto shrink-0">
                  <button type="button" on:click={deleteOwnAccount} disabled={saveLoading || !confirmPassword} class="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50">{saveLoading ? 'Excluindo...' : 'Confirmar'}</button>
                  <button type="button" on:click={() => { showDeleteConfirmation = false; confirmPassword = ''; }} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">Cancelar</button>
                </div>
              </div>
            </div>
          {/if}
        </div>

      {/if} 
    </div> 
  </div> 
{/if}

<!-- MODAL DE CONFIRMAÇÃO DE SENHA (Adicionado respeitando a sua identidade visual brutalista/escura) -->
{#if showPasswordModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/80 backdrop-blur-sm">
    <div class="w-full max-w-md bg-neutral-900 border border-amber-600/50 p-6 shadow-2xl flex flex-col gap-4">
      <div>
        <h3 class="text-sm font-black text-amber-500 uppercase tracking-[0.15em]">Confirmar Alteração</h3>
        <p class="text-xs text-neutral-300 mt-2 font-light tracking-wide leading-relaxed">
          Você tem certeza de que deseja alterar sua senha de acesso? Você será mantido conectado, mas sua senha antiga deixará de funcionar imediatamente.
        </p>
      </div>
      
      <div class="flex gap-3 justify-end mt-2">
        <button 
          type="button" 
          on:click={cancelEdit} 
          disabled={saveLoading} 
          class="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">
          Cancelar
        </button>
        <button 
          type="button" 
          on:click={confirmSavePassword} 
          disabled={saveLoading} 
          class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-neutral-950 rounded-none text-[10px] font-bold uppercase tracking-wider transition-colors">
          {saveLoading ? 'Alterando...' : 'Confirmar Alteração'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(input::placeholder) {
    color: #C47B54 !important; 
    opacity: 0.7 !important; 
  }
</style>