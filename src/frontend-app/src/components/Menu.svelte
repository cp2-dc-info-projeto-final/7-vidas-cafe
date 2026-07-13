<script lang="ts">
  import { Navbar, NavBrand, NavLi, NavUl, NavHamburger, Heading} from "flowbite-svelte";
  import { onMount } from "svelte";
  import { logout, getCurrentUser, getToken, type User, login } from "$lib/auth";
  import { goto } from "$app/navigation";
  import { ArrowRightToBracketOutline } from "flowbite-svelte-icons";
  import { CartOutline } from "flowbite-svelte-icons";
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
  onMount(() => { void updateAuthStatus(); });

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
/* Estilização do Menu Mobile no padrão Cafuné */
@media (max-width: 767px) {
  :global(nav ul) {
    background-color: rgba(10, 10, 10, 0.98) !important; 
    border: 1px solid #1c1917 !important; 
    padding: 1.75rem 1.25rem !important;
    border-radius: 0px !important;
  }
  :global(nav ul li a) {
    color: #f5f5f5 !important;
    font-size: 1.05rem !important;
    padding-top: 0.85rem !important;
    padding-bottom: 0.85rem !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
}
</style>

<div class="relative w-full">
  <Navbar 
    class="fixed start-0 top-0 z-50 w-full bg-neutral- bg-cover bg-center bg-blend-multiply backdrop-blur-md border-b border-neutral-900/60 px-6 md:px-10 py-4 md:py-6 transition-all duration-300 flex items-center justify-between"
  >
    
    <NavBrand href="/" class="flex items-center gap-3.5">
      <img src="images/logo_sete_vidas_cafe.png" class="h-12 sm:h-16 md:h-18 object-contain transition-transform duration-300 hover:scale-105" alt="Logo Sete Vidas" />
      <div class="flex flex-col">
        <Heading class="text-xl sm:text-2xl font-black tracking-[0.22em] text-white uppercase font-serif leading-none">
          7 Vidas Café
        </Heading>
        <span class="text-[11px] font-bold tracking-[0.35em] text-amber-500 uppercase mt-1">Café & Gatos</span>
      </div>
    </NavBrand>
    
    <NavHamburger class="text-white hover:bg-neutral-900 focus:ring-0" />
    
    <NavUl class="bg-transparent md:bg-transparent border-none md:flex md:items-center md:gap-7">
      
      <NavLi href="/" nonActiveClass="text-[15px] font-bold uppercase tracking-[0.18em] px-3.5 py-2 text-neutral-200 hover:text-amber-500 transition-all duration-300 rounded-none relative after:absolute after:bottom-0 after:left-3.5 after:right-3.5 after:h-[1px] after:bg-amber-500 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300">
        Home
      </NavLi>
      
      <NavLi href="/about" nonActiveClass="text-[15px] font-bold uppercase tracking-[0.18em] px-3.5 py-2 text-neutral-200 hover:text-amber-500 transition-all duration-300 rounded-none relative after:absolute after:bottom-0 after:left-3.5 after:right-3.5 after:h-[1px] after:bg-amber-500 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300">
        Sobre
      </NavLi>

      <NavLi href="/gatos" nonActiveClass="text-[15px] font-bold uppercase tracking-[0.18em] px-3.5 py-2 text-neutral-200 hover:text-amber-500 transition-all duration-300 rounded-none relative after:absolute after:bottom-0 after:left-3.5 after:right-3.5 after:h-[1px] after:bg-amber-500 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300">
        Gatos
      </NavLi>

      <NavLi href="/Cardapi" nonActiveClass="text-[15px] font-bold uppercase tracking-[0.18em] px-3.5 py-2 text-neutral-200 hover:text-amber-500 transition-all duration-300 rounded-none relative after:absolute after:bottom-0 after:left-3.5 after:right-3.5 after:h-[1px] after:bg-amber-500 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300">
        Cardápio
      </NavLi>
      
      {#if hasToken}
        {#if user}
          
          
          {#if user.role === 'admin'} 
            <NavLi href="/users" nonActiveClass="text-[15px] font-bold uppercase tracking-[0.18em] px-3.5 py-2 text-amber-500 hover:text-amber-400 transition-all duration-300 rounded-none">
              Usuários
            </NavLi>
          {/if}

          <NavLi nonActiveClass="flex items-center justify-center py-2 md:py-0">
            <button 
              on:click={() => goto('/carrinho')}
              class="text-neutral-200 hover:text-amber-500 transition-all duration-300 rounded-none flex items-center justify-center focus:outline-none h-full"
              aria-label="Carrinho de compras"
            >
              <CartOutline class="w-7 h-7 mt-1" />
            </button>
          </NavLi>
          
          <NavLi href="/perfil" nonActiveClass="text-[15px] font-bold uppercase tracking-[0.18em] px-3.5 py-2 text-amber-500 hover:text-amber-400 transition-all duration-300 rounded-none relative after:absolute after:bottom-0 after:left-3.5 after:right-3.5 after:h-[1px] after:bg-amber-400 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300">
            {user.login}
          </NavLi>

          <NavLi>
            <div class="flex items-center">
              <button 
                class="ml-2 px-3.5 py-2.5 bg-neutral-900/60 hover:bg-red-950/30 border border-neutral-800 hover:border-red-900/50 text-neutral-400 hover:text-red-400 rounded-none text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all duration-300"
                on:click={handleLogout}
              >
                <ArrowRightToBracketOutline class="w-4 h-4" />
                Sair
              </button>
            </div>
          </NavLi>
        {:else if loadingUser}
          <NavLi class="text-xs font-bold uppercase tracking-[0.2em] px-3.5 py-2 text-neutral-500 animate-pulse">
            Carregando...
          </NavLi>
        {:else}
          <NavLi href="/login" nonActiveClass="text-[15px] font-bold uppercase tracking-[0.18em] px-3.5 py-2 text-neutral-200 hover:text-amber-500 transition-all duration-300 rounded-none">
            Login
          </NavLi>
        {/if}
      {:else}
        <NavLi href="/login" nonActiveClass="text-xs font-bold uppercase tracking-[0.22em] px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-neutral-950 transition-all duration-300 rounded-none shadow-2xl block md:inline-block text-center hover:-translate-y-0.5">
          Login
        </NavLi>
      {/if}
      
    </NavUl>
  </Navbar>
</div>