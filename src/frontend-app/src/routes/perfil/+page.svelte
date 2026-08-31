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

    if (field === 'password' && !bypassModal) {
      saveLoading = false;
      showPasswordModal = true;
      return;
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
      showPasswordModal = false;
    } catch (e: any) {
      console.error(e);
      error = e.message || 'Falha ao salvar alteração.';
    } finally {
      saveLoading = false;
    }
  }

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

<main class="pt-36 pb-20 px-4 sm:px-6 lg:px-8 relative z-30 flex justify-center">
  {#if loading}
    <div class="my-32 text-center text-primary-300 font-medium uppercase tracking-widest text-xs">Carregando informações do perfil...</div>
  {:else}
    <div class="w-full max-w-2xl bg-primary-900/90 backdrop-blur-xl border border-primary-700/60 shadow-2xl rounded-2xl p-6 sm:p-10 flex flex-col gap-8">
      
      <!-- Cabeçalho do Perfil -->
      <div class="flex items-center justify-between border-b border-primary-800 pb-5 gap-4">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-[0.25em] text-tertiary-400 block mb-1">Painel do Usuário</span>
          <h2 class="text-xl sm:text-2xl font-black tracking-wider text-primary-50 font-serif">Configurações da Conta</h2>
        </div>
        <Badge class="bg-primary-950 text-tertiary-300 border border-primary-700 rounded-lg text-[11px] font-bold uppercase tracking-widest px-3.5 py-1.5 shadow-inner shrink-0">
          {user?.role}
        </Badge>
      </div>

      {#if error}
        <div class="text-xs font-medium tracking-wide text-red-300 bg-red-950/60 p-4 rounded-xl border border-red-900/50 flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      {/if}

      {#if user}
        <div class="flex flex-col gap-5">
          
          {#each [
            { label: 'Usuário', field: 'login', type: 'text', val: user.login, placeholder: '' },
            { label: 'E-mail', field: 'email', type: 'email', val: user.email, placeholder: '' },
            { label: 'Senha', field: 'password', type: 'password', val: '********', placeholder: 'Digite a nova senha' },
            { label: 'CPF', field: 'cpf', type: 'text', val: user.cpf, placeholder: '123.456.789-00' },
            { label: 'Nascimento', field: 'dat_nas', type: 'date', val: user.dat_nas ? new Date(user.dat_nas).toLocaleDateString('pt-BR') : 'Não informada', placeholder: '' },
            { label: 'Telefone', field: 'num_tel', type: 'text', val: user.num_tel || 'Não informado', placeholder: '(21)92345-6789' }
          ] as item}
            <div class="group bg-primary-950/40 border border-primary-800/80 hover:border-primary-700 transition-all rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div class="w-full sm:w-1/4">
                <span class="text-[10px] font-bold uppercase tracking-widest text-primary-300 block">{item.label}</span>
              </div>
              
              <div class="w-full sm:w-3/4 flex flex-col sm:flex-row items-center gap-3">
                {#if editingField === item.field}
                  {#if item.field === 'dat_nas'}
                    <input type="date" min="1900-01-01" max={dataLimite16Anos} bind:value={editValue} disabled={saveLoading} class="w-full text-primary-50 bg-primary-900 border border-primary-700 rounded-lg p-2.5 text-xs focus:outline-none focus:border-tertiary-500 transition-colors" />
                  {:else}
                    <input type={item.type} placeholder={item.placeholder} bind:value={editValue} disabled={saveLoading} class="w-full text-primary-50 bg-primary-900 border border-primary-700 rounded-lg p-2.5 text-xs focus:outline-none focus:border-tertiary-500 transition-colors" />
                  {/if}
                  <div class="flex gap-2 w-full sm:w-auto shrink-0">
                    <button on:click={() => saveField(item.field)} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2 bg-tertiary-600 hover:bg-tertiary-500 text-primary-950 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all shadow-md">Salvar</button>
                    <button on:click={cancelEdit} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2 bg-primary-800 hover:bg-primary-700 text-primary-100 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all">Sair</button>
                  </div>
                {:else}
                  <div class="w-full text-primary-100 text-xs font-medium truncate flex items-center py-1">
                    {item.val}
                  </div>
                  <button on:click={() => startEdit(item.field, item.field === 'dat_nas' ? user.dat_nas : (item.field === 'password' ? '' : item.val))} class="w-full sm:w-auto shrink-0 px-4 py-2 bg-primary-900 hover:bg-primary-800 border border-primary-700 text-tertiary-300 hover:text-tertiary-200 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all">Editar</button>
                {/if}
              </div>
            </div>
          {/each}

        </div>

        <!-- ZONA DE PERIGO -->
        <div class="mt-4 pt-6 border-t border-primary-800 bg-red-950/20 p-5 rounded-xl border border-red-900/30 flex flex-col gap-4">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 class="text-xs font-black text-red-400 uppercase tracking-[0.2em]">Zona de Perigo</h3>
              <p class="text-[11px] text-primary-300 mt-1 font-light tracking-wide leading-relaxed">Ao excluir sua conta, todos os seus dados serão apagados permanentemente do sistema.</p>
            </div>
            {#if !showDeleteConfirmation}
              <button on:click={() => { showDeleteConfirmation = true; error = ''; }} class="w-full md:w-auto shrink-0 px-4 py-2.5 bg-red-950/60 hover:bg-red-900/50 border border-red-800 text-red-300 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm">Excluir conta</button>
            {/if}
          </div>

          {#if showDeleteConfirmation}
            <div class="mt-2 p-4 bg-primary-950 border border-red-900/50 rounded-xl flex flex-col gap-3 shadow-inner">
              <label for="confirm-pass" class="text-[10px] font-bold uppercase tracking-wider text-primary-300">Para confirmar a exclusão, digite sua senha atual:</label>
              <div class="flex flex-col sm:flex-row gap-2">
                <input id="confirm-pass" type="password" placeholder="Sua senha atual" bind:value={confirmPassword} disabled={saveLoading} class="w-full text-primary-50 bg-primary-900 border border-red-900/60 rounded-lg p-2.5 text-xs focus:outline-none focus:border-red-500" />
                <div class="flex gap-2 w-full sm:w-auto shrink-0">
                  <button type="button" on:click={deleteOwnAccount} disabled={saveLoading || !confirmPassword} class="flex-1 sm:flex-none px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50">{saveLoading ? 'Excluindo...' : 'Confirmar'}</button>
                  <button type="button" on:click={() => { showDeleteConfirmation = false; confirmPassword = ''; }} disabled={saveLoading} class="flex-1 sm:flex-none px-4 py-2.5 bg-primary-800 hover:bg-primary-700 text-primary-100 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors">Cancelar</button>
                </div>
              </div>
            </div>
          {/if}
        </div>

      {/if} 
    </div> 
  {/if}
</main>

<!-- MODAL DE CONFIRMAÇÃO DE SENHA -->
{#if showPasswordModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-950/80 backdrop-blur-md">
    <div class="w-full max-w-md bg-primary-900 border border-tertiary-600/60 p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col gap-5">
      <div>
        <h3 class="text-sm font-black text-tertiary-400 uppercase tracking-[0.15em]">Confirmar Alteração</h3>
        <p class="text-xs text-primary-200 mt-2 font-light tracking-wide leading-relaxed">
          Você tem certeza de que deseja alterar sua senha de acesso? Você será mantido conectado, mas sua senha antiga deixará de funcionar imediatamente.
        </p>
      </div>
      
      <div class="flex gap-3 justify-end mt-2">
        <button 
          type="button" 
          on:click={cancelEdit} 
          disabled={saveLoading} 
          class="px-4 py-2.5 bg-primary-800 hover:bg-primary-700 text-primary-100 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors">
          Cancelar
        </button>
        <button 
          type="button" 
          on:click={confirmSavePassword} 
          disabled={saveLoading} 
          class="px-4 py-2.5 bg-tertiary-600 hover:bg-tertiary-500 text-primary-950 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shadow-md">
          {saveLoading ? 'Alterando...' : 'Confirmar Alteração'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(input::placeholder) {
    color: #C0AA9B !important; 
    opacity: 0.6 !important; 
  }
</style>