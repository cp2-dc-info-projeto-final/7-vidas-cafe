<script lang="ts">
  import { Navbar, NavBrand, NavLi, NavUl, NavHamburger, Heading} from "flowbite-svelte";
  import { onMount } from "svelte";
  import { logout, getCurrentUser, getToken, type User, login } from "$lib/auth";
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

<style>
/* Aplica o estilo APENAS em telas menores que o desktop (Mobile / Tablet) */
@media (max-width: 767px) {
  :global(nav ul) {
    background-color: #e7c0a1  !important;
    border: 1px solid #795e45  !important;
    padding: 1rem !important;
    border-radius: 0.5rem !important;
  }

  :global(nav ul li a) {
    color: #4a3728 !important; /* Texto escuro apenas no menu mobile */
  }
}
</style>

<div class="relative px-8">
  <Navbar class="fixed start-0 top-0 z-20 w-full bg-primary-500 px-2 py-2.5 sm:px-4">
    <NavBrand href="/">
      <img src="images/logo_sete_vidas_cafe.png" class="me-3 h-6 sm:h-28" alt="Logo aleatória" />
      <Heading class="self-center text-xl font-semibold whitespace-nowrap text-primary-950 dark:text-primary-400">Sete Vidas Café</Heading>
    </NavBrand>
    
    <NavHamburger class="text-primary-950 hover:bg-primary-100 focus:ring-primary-300 dark:text-primary-400 dark:hover:bg-primary-700" />
    
    <NavUl>
      <NavLi href="/" nonActiveClass="text-lg font-bold px-4 py-2 text-primary-950 dark:text-primary-400 hover:text-tertiary-200 hover:bg-primary-700 focus:text-tertiary-950 focus:bg-tertiary-50 transition-colors rounded-lg">Home</NavLi>
      <NavLi href="/about" nonActiveClass="text-lg font-bold px-4 py-2 text-primary-950 dark:text-primary-400 hover:text-tertiary-200 hover:bg-primary-700 focus:text-tertiary-950 focus:bg-tertiary-50 transition-colors rounded-lg">Sobre</NavLi>
      
      {#if hasToken}
        {#if user}
          {#if user.role === 'admin'} 
            <NavLi href="/users" nonActiveClass="text-lg font-bold px-4 py-2 text-primary-950 dark:text-primary-400 hover:text-tertiary-50 hover:bg-tertiary-800 focus:text-tertiary-950 focus:bg-tertiary-50 transition-colors rounded-lg">Usuários</NavLi>
          {/if}
          <NavLi href="/perfil" nonActiveClass="inline-block text-2xl border border-tertiary-700 font-medium px-4 py-1 -mt-1 -mb-1 text-tertiary-200 dark:text-primary-400 hover:text-tertiary-100 hover:bg-primary-600 focus:text-tertiary-950 focus:bg-tertiary-50 transition-colors rounded-lg">{user.login}</NavLi>

          <NavLi>
            <div class="flex items-center">
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
        <NavLi href="/login" nonActiveClass="text-lg font-bold px-4 py-2 text-primary-950 dark:text-primary-400 hover:text-tertiary-50 hover:bg-tertiary-500 focus:text-tertiary-950 focus:bg-tertiary-50 transition-colors rounded-lg">Login</NavLi>
      {/if}
    </NavUl>
  </Navbar>
</div>