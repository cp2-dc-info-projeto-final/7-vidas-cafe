<script lang="ts">
  import { Navbar, NavBrand, NavLi, NavUl, NavHamburger, Heading} from "flowbite-svelte";
  import { onMount } from "svelte";
  import { logout, getCurrentUser, getToken, type User } from "$lib/auth";
  import { goto } from "$app/navigation";
  import { ArrowRightToBracketOutline } from "flowbite-svelte-icons";
  import { page } from "$app/stores";
  
  let user: User | null = null;
  let hasToken = false;
  let loadingUser = false;
  let authRequestId = 0;

  // Verifica token sincronamente (instantâneo)
  async function updateAuthStatus() {
    hasToken = getToken() !== null;

    if (!hasToken) {
      user = null;
      loadingUser = false;
      return;
    }

    if (user || loadingUser) {
      return;
    }

    loadingUser = true;
    const requestId = ++authRequestId;

    try {
      const userData = await getCurrentUser();
      if (requestId !== authRequestId) {
        return;
      }
      user = userData;
      hasToken = userData !== null;
    } catch {
      if (requestId !== authRequestId) {
        return;
      }
      user = null;
      hasToken = false;
    } finally {
      if (requestId === authRequestId) {
        loadingUser = false;
      }
    }
  }

  // Reativo à mudança de página
  $: if ($page.url.pathname) {
    void updateAuthStatus();
  }

  onMount(() => {
    void updateAuthStatus();
  });

  // função para logout (só apaga o token)
  async function handleLogout() {
    try {
      authRequestId += 1;
      await logout();
      user = null;
      hasToken = false;
      loadingUser = false;
      goto('/login');
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  }
</script>

<div class="relative px-8">
  <Navbar class="fixed start-0 top-0 -20 w-full bg-primary-500 px-2 py-2.5 sm:px-4">
    <NavBrand href="/">
      <img src="images/logo_sete_vidas_cafe.png" class="me-3 h-6 sm:h-28" alt="Logo aleatória" />
      <Heading class="self-center text-xl font-semibold whitespace-nowrap text-primary-950 dark:text-primary-400">Sete Vidas Café</Heading>
    </NavBrand>
    <NavHamburger />
    <NavUl>
      <NavLi href="/" nonActiveClass="text-lg font-bold px-4 py-2 text-primary-950 dark:text-primary-400 hover:text-tertiary-200 hover:bg-primary-700 focus:text-tertiary-950 focus:bg-tertiary-50 transition-colors rounded-lg">Home</NavLi>
      <NavLi href="/about" nonActiveClass="text-lg font-bold px-4 py-2 text-primary-950 dark:text-primary-400 hover:text-tertiary-200 hover:bg-primary-700 focus:text-tertiary-950 focus:bg-tertiary-50 transition-colors rounded-lg">Sobre</NavLi>
      
      {#if hasToken}
        {#if user} <!-- se existir usuário é porque conseguiu logar-->
          {#if user.role === 'admin'} <!-- só exibe menu usuários para admin-->
            <NavLi href="/users" nonActiveClass="text-lg font-bold px-4 py-2 text-primary-950 dark:text-primary-400 hover:text-tertiary-50 hover:bg-tertiary-800 focus:text-tertiary-950 focus:bg-tertiary-50 transition-colors rounded-lg">Usuários</NavLi>
          {/if}
          <NavLi>
            <div class="flex items-center">
              <span class="text-primary-950 dark:text-primary-400 px-4 py-2">Olá, {user.login}</span>
              <button 
                class="ml-2 px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm flex items-center gap-1"
                on:click={handleLogout}
              >
                <ArrowRightToBracketOutline class="w-4 h-4" />
                Sair
              </button>
            </div>
          </NavLi>
        {:else if loadingUser}
          <NavLi class="text-lg font-bold px-4 py-2 text-primary-500 dark:text-primary-400">Carregando...</NavLi>
        {:else}
          <NavLi href="/login" nonActiveClass="text-lg font-bold px-4 py-2 text-primary-950 dark:text-primary-400 hover:text-tertiary-50 hover:bg-tertiary-700 focus:text-tertiary-950 focus:bg-tertiary-50 transition-colors rounded-lg">Login</NavLi>
        {/if}
      {:else}
        <!-- se não tem token, exibe botão de login-->
        <NavLi href="/login" nonActiveClass="text-lg font-bold px-4 py-2 text-primary-950 dark:text-primary-400 hover:text-tertiary-50 hover:bg-tertiary-500 focus:text-tertiary-950 focus:bg-tertiary-50 transition-colors rounded-lg">Login</NavLi>
      {/if}
    </NavUl>
  </Navbar>
</div>