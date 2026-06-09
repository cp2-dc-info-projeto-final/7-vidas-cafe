<script lang="ts">
  import { Heading, Badge } from 'flowbite-svelte';
  import Menu from '../../components/Menu.svelte';
  import { goto } from "$app/navigation";
  // Certifique-se de que a sua api ou lib de auth tenha uma função para atualizar os dados, ou use o fetch diretamente.
  import { getCurrentUser, getToken, type User } from "$lib/auth"; 
  import { onMount } from 'svelte';

  let user: User | null = null;
  let loading = true;
  let error = '';

  // Estados para controle de edição por campo
  let editingField: string | null = null;
  let editValue: string = '';
  let saveLoading = false;

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

  // Ativa o modo de edição para um campo específico
  function startEdit(field: string, initialValue: any) {
    editingField = field;
    // Se for data, tenta formatar para o padrão YYYY-MM-DD que o <input type="date"> exige
    if (field === 'dat_nas' && initialValue) {
      editValue = new Date(initialValue).toISOString().split('T')[0];
    } else {
      editValue = initialValue || '';
    }
  }

  // Cancela a edição atual
  function cancelEdit() {
    editingField = null;
    editValue = '';
  }

  // Envia a atualização para o Backend
  async function saveField(field: string) {
    if (!user) return;
    saveLoading = true;
    error = '';

    // Monta o payload mantendo os dados atuais e substituindo apenas o editado
    // O seu backend exige esses campos estruturados no req.body
    const updatedData = {
      login: user.login,
      email: user.email,
      cpf: user.cpf,
      dat_nas: user.dat_nas,
      num_tel: user.num_tel,
      role: user.role,
      [field]: editValue // Sobrescreve o campo que mudou
    };

    try {
      // Ajuste a URL/Headers conforme a estrutura do seu projeto de front-end
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
        throw new Error(result.message || 'Erro ao atualizar dados.');
      }

      // Se deu certo, recarrega os dados atualizados no front-end
      await loadUserData();
      editingField = null;
    } catch (e: any) {
      console.error(e);
      error = e.message || 'Falha ao salvar alteração.';
    } finally {
      saveLoading = false;
    }
  }
</script>

<Menu />

{#if loading}
  <div class="my-8 text-center text-gray-500">Carregando informações do perfil...</div>
{:else}
  <div class="w-full max-w-2xl mx-auto my-10 bg-tertiary-100 border border-secondary-200 rounded-lg shadow-sm p-8 flex flex-col gap-6">
    
    <div class="flex items-center justify-between border-b border-secondary-200 pb-4 mb-2">
      <h2 class="text-xl font-semibold text-primary-500">Informações do Perfil</h2>
      <Badge color={user?.role === 'admin' ? 'secondary' : 'yellow'} class="text-xs uppercase">
        {user?.role}
      </Badge>
    </div>

    {#if error}
      <div class="text-sm text-red-500 bg-red-50 p-2.5 rounded border border-red-200">{error}</div>
    {/if}

    {#if user}
      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
        <div class="w-full sm:w-1/4 sm:text-right font-semibold text-primary-500 text-sm sm:text-base">
          Nome de Usuário
        </div>
        <div class="w-full sm:w-3/4 flex gap-2">
          {#if editingField === 'login'}
            <input type="text" bind:value={editValue} disabled={saveLoading} class="flex-1 text-tertiary-900 bg-tertiary-300 border border-primary-500 rounded-md p-2 text-sm focus:outline-none" />
            <button on:click={() => saveField('login')} disabled={saveLoading} class="px-3 py-1 bg-tertiary-400 text-white rounded text-xs font-semibold hover:bg-primary-600 disabled:opacity-50">Salvar</button>
            <button on:click={cancelEdit} disabled={saveLoading} class="px-3 py-1 bg-tertiary-700 text-white rounded text-xs font-semibold hover:bg-secondary-500 disabled:opacity-50">Cancelar</button>
          {:else}
            <div class="flex-1 text-secondary-600 bg-tertiary-200 border border-secondary-200 rounded-md p-2.5 text-sm font-medium">
              {user.login}
            </div>
            <button on:click={() => startEdit('login', user.login)} class="px-3 py-1 bg-primary-500 text-white rounded text-xs font-semibold hover:bg-primary-600 transition-colors">Editar</button>
          {/if}
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
        <div class="w-full sm:w-1/4 sm:text-right font-semibold text-primary-500 text-sm sm:text-base">
          E-mail
        </div>
        <div class="w-full sm:w-3/4 flex gap-2">
          {#if editingField === 'email'}
            <input type="email" bind:value={editValue} disabled={saveLoading} class="flex-1 text-tertiary-900 bg-tertiary-300 border border-primary-500 rounded-md p-2 text-sm focus:outline-none" />
            <button on:click={() => saveField('email')} disabled={saveLoading} class="px-3 py-1 bg-tertiary-400 text-white rounded text-xs font-semibold hover:bg-primary-600 disabled:opacity-50">Salvar</button>
            <button on:click={cancelEdit} disabled={saveLoading} class="px-3 py-1 bg-tertiary-700 text-white rounded text-xs font-semibold hover:bg-secondary-500 disabled:opacity-50">Cancelar</button>
          {:else}
            <div class="flex-1 text-secondary-600 bg-tertiary-200 border border-secondary-200 rounded-md p-2.5 text-sm">
              {user.email}
            </div>
            <button on:click={() => startEdit('email', user.email)} class="px-3 py-1 bg-primary-500 text-white rounded text-xs font-semibold hover:bg-primary-600 transition-colors">Editar</button>
          {/if}
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
        <div class="w-full sm:w-1/4 sm:text-right font-semibold text-primary-500 text-sm sm:text-base">
          CPF
        </div>
        <div class="w-full sm:w-3/4 flex gap-2">
          {#if editingField === 'cpf'}
            <input type="text" bind:value={editValue} disabled={saveLoading} class="flex-1 text-tertiary-900 bg-tertiary-300 border border-primary-500 rounded-md p-2 text-sm focus:outline-none" />
            <button on:click={() => saveField('cpf')} disabled={saveLoading} class="px-3 py-1 bg-tertiary-400 text-white rounded text-xs font-semibold hover:bg-primary-600 disabled:opacity-50">Salvar</button>
            <button on:click={cancelEdit} disabled={saveLoading} class="px-3 py-1 bg-tertiary-700 text-white rounded text-xs font-semibold hover:bg-secondary-500 disabled:opacity-50">Cancelar</button>
          {:else}
            <div class="flex-1 text-secondary-600 bg-tertiary-200 border border-secondary-200 rounded-md p-2.5 text-sm">
              {user.cpf}
            </div>
            {#if user.role === 'admin'}
              <button on:click={() => startEdit('cpf', user.cpf)} class="px-3 py-1 bg-primary-500 text-white rounded text-xs font-semibold hover:bg-primary-600 transition-colors">Editar</button>
            {/if}
          {/if}
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
        <div class="w-full sm:w-1/4 sm:text-right font-semibold text-primary-500 text-sm sm:text-base">
          Nascimento
        </div>
        <div class="w-full sm:w-3/4 flex gap-2">
          {#if editingField === 'dat_nas'}
            <input type="date" bind:value={editValue} disabled={saveLoading} class="flex-1 text-tertiary-900 bg-tertiary-300 border border-primary-500 rounded-md p-2 text-sm focus:outline-none" />
            <button on:click={() => saveField('dat_nas')} disabled={saveLoading} class="px-3 py-1 bg-tertiary-400 text-white rounded text-xs font-semibold hover:bg-primary-600 disabled:opacity-50">Salvar</button>
            <button on:click={cancelEdit} disabled={saveLoading} class="px-3 py-1 bg-tertiary-700 text-white rounded text-xs font-semibold hover:bg-secondary-500 disabled:opacity-50">Cancelar</button>
          {:else}
            <div class="flex-1 text-secondary-600 bg-tertiary-200 border border-secondary-200 rounded-md p-2.5 text-sm">
              {user.dat_nas ? new Date(user.dat_nas).toLocaleDateString('pt-BR') : 'Não informada'}
            </div>
            {#if user.role === 'admin'}
              <button on:click={() => startEdit('dat_nas', user.dat_nas)} class="px-3 py-1 bg-primary-500 text-white rounded text-xs font-semibold hover:bg-primary-600 transition-colors">Editar</button>
            {/if}
          {/if}
        </div>
      </div>

      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
        <div class="w-full sm:w-1/4 sm:text-right font-semibold text-primary-500 text-sm sm:text-base">
          Telefone
        </div>
        <div class="w-full sm:w-3/4 flex gap-2">
          {#if editingField === 'num_tel'}
            <input type="text" bind:value={editValue} disabled={saveLoading} class="flex-1 text-tertiary-900 bg-tertiary-300 border border-primary-500 rounded-md p-2 text-sm focus:outline-none" />
            <button on:click={() => saveField('num_tel')} disabled={saveLoading} class="px-3 py-1 bg-tertiary-400 text-white rounded text-xs font-semibold hover:bg-primary-600 disabled:opacity-50">Salvar</button>
            <button on:click={cancelEdit} disabled={saveLoading} class="px-3 py-1 bg-tertiary-700 text-white rounded text-xs font-semibold hover:bg-secondary-500 disabled:opacity-50">Cancelar</button>
          {:else}
            <div class="flex-1 text-secondary-600 bg-tertiary-200 border border-secondary-200 rounded-md p-2.5 text-sm">
              {user.num_tel || 'Não informado'}
            </div>
            <button on:click={() => startEdit('num_tel', user.num_tel)} class="px-3 py-1 bg-primary-500 text-white rounded text-xs font-semibold hover:bg-primary-600 transition-colors">Editar</button>
          {/if}
        </div>
      </div>
    {/if}

  </div>
{/if}