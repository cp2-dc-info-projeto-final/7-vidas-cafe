<script lang="ts">
  import { Heading, Badge } from 'flowbite-svelte';
  import Menu from '../../components/Menu.svelte';
  import { goto } from "$app/navigation";
  import { getCurrentUser, getToken, type User } from "$lib/auth";
  import { onMount } from 'svelte';

  let user: User | null = null;
  let loading = true;
  let error = '';

  onMount(async () => {
    const token = getToken();
    
    if (!token) {
      error = 'Usuário não autenticado.';
      loading = false;
      goto('/login'); // Opcional: Redireciona se não houver token
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
  });
</script>

<Menu />

{#if loading}
  <div class="my-8 text-center text-gray-500">Carregando informações do perfil...</div>
{:else if error}
  <div class="my-8 text-center text-red-500">{error}</div>
{:else if user}
  <div class="w-full max-w-2xl mx-auto my-10 bg-tertiary-100 border border-secondary-200 rounded-lg shadow-sm p-8 flex flex-col gap-6">
    
    <div class="flex items-center justify-between border-b border-secondary-200 pb-4 mb-2">
      <h2 class="text-xl font-semibold text-primary-500">Informações do Perfil</h2>
      <Badge color={user.role === 'admin' ? 'secondary' : 'yellow'} class="text-xs uppercase">
        {user.role}
      </Badge>
    </div>

    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
      <div class="w-full sm:w-1/4 sm:text-right font-semibold text-primary-500 text-sm sm:text-base">
        Nome de Usuário
      </div>
      <div class="w-full sm:w-3/4 text-secondary-600 bg-tertiary-200 border border-secondary-200 rounded-md p-2.5 text-sm font-medium">
        {user.login}
      </div>
    </div>

    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
      <div class="w-full sm:w-1/4 sm:text-right font-semibold text-primary-500 text-sm sm:text-base">
        E-mail
      </div>
      <div class="w-full sm:w-3/4 text-secondary-600 bg-tertiary-200 border border-secondary-200 rounded-md p-2.5 text-sm">
        {user.email}
      </div>
    </div>

    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
      <div class="w-full sm:w-1/4 sm:text-right font-semibold text-primary-500 text-sm sm:text-base">
        CPF
      </div>
      <div class="w-full sm:w-3/4 text-secondary-600 bg-tertiary-200 border border-secondary-200 rounded-md p-2.5 text-sm">
        {user.cpf}
      </div>
    </div>

    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
      <div class="w-full sm:w-1/4 sm:text-right font-semibold text-primary-500 text-sm sm:text-base">
        Nascimento
      </div>
      <div class="w-full sm:w-3/4 text-secondary-600 bg-tertiary-200 border border-secondary-200 rounded-md p-2.5 text-sm">
        {user.dat_nas ? new Date(user.dat_nas).toLocaleDateString('pt-BR') : 'Não informada'}
      </div>
    </div>

    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
      <div class="w-full sm:w-1/4 sm:text-right font-semibold text-primary-500 text-sm sm:text-base">
        Telefone
      </div>
      <div class="w-full sm:w-3/4 text-secondary-600 bg-tertiary-200 border border-secondary-200 rounded-md p-2.5 text-sm">
        {user.num_tel || 'Não informado'}
      </div>
    </div>

  </div>
{/if}