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
    padding: 2rem 1.5rem !important;
    border-radius: 0px !important; /* Sem arredondamento, design reto */
  }
  :global(nav ul li a) {
    color: #f5f5f5 !important;
    font-size: 1.125rem !important;
    padding-top: 1rem !important;
    padding-bottom: 1rem !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
}
</style>

<div class="relative w-full">
  <!-- 
    ESTILO CAFUNÉ:
    Aumentamos drasticamente o padding vertical (`py-8 md:py-12`) para criar o cabeçalho gigante.
    Aumentamos o padding horizontal (`px-8 md:px-16`) para dar um visual de ponta a ponta luxuoso.
  -->
  <Navbar 
    class="fixed start-0 top-0 z-50 w-full bg-neutral-950/90 bg-cover bg-center bg-blend-multiply backdrop-blur-md border-b border-neutral-900/60 px-8 py-8 md:py-12 transition-all duration-300 flex items-center justify-between"
    style="background-image: url('/images/cafescafes.png');"
  >
    
    <NavBrand href="/" class="flex items-center gap-4">
      <!-- Logo imponente e grande para combinar com a altura do cabeçalho -->
      <img src="images/logo_sete_vidas_cafe.png" class="h-14 sm:h-20 md:h-24 object-contain transition-transform duration-300 hover:scale-105" alt="Logo Sete Vidas" />
      <div class="flex flex-col">
        <Heading class="text-2xl sm:text-3xl font-black tracking-[0.25em] text-white uppercase font-serif leading-none">
          7 Vidas Café
        </Heading>
        <span class="text-xs font-bold tracking-[0.4em] text-amber-500 uppercase mt-1">Café & Felinos</span>
      </div>
    </NavBrand>
    
    <NavHamburger class="text-white hover:bg-neutral-900 scale-125 focus:ring-0" />
    
    <!-- 
      LINKS GRANDES E ESPAÇADOS:
      Aumentamos o tamanho da fonte para `text-base` e adicionamos um espaçamento entre letras generoso (`tracking-[0.2em]`).
    -->
    <NavUl class="bg-transparent md:bg-transparent border-none md:flex md:items-center md:gap-8">
      
      <NavLi href="/" nonActiveClass="text-base font-bold uppercase tracking-[0.2em] px-4 py-2 text-neutral-200 hover:text-amber-500 transition-all duration-300 rounded-none relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[1px] after:bg-amber-500 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300">
        Home
      </NavLi>
      
      <NavLi href="/about" nonActiveClass="text-base font-bold uppercase tracking-[0.2em] px-4 py-2 text-neutral-200 hover:text-amber-500 transition-all duration-300 rounded-none relative after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[1px] after:bg-amber-500 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300">
        Sobre
      </NavLi>
      
      {#if hasToken}
        {#if user}
          {#if user.role === 'admin'} 
            <NavLi href="/users" nonActiveClass="text-base font-bold uppercase tracking-[0.2em] px-4 py-2 text-amber-500 hover:text-amber-400 transition-all duration-300 rounded-none">
              Usuários
            </NavLi>
          {/if}
          
          <!-- Perfil formatado como um botão minimalista vazado premium -->
          <NavLi href="/perfil" nonActiveClass="inline-block text-sm font-bold uppercase tracking-[0.15em] border border-amber-600 px-5 py-2.5 text-amber-500 hover:bg-amber-600 hover:text-neutral-950 transition-all duration-300 rounded-none">
            {user.login}
          </NavLi>

          <NavLi>
            <div class="flex items-center">
              <button 
                class="ml-2 px-4 py-2.5 bg-neutral-900/60 hover:bg-red-950/30 border border-neutral-800 hover:border-red-900/50 text-neutral-400 hover:text-red-400 rounded-none text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all duration-300"
                on:click={handleLogout}
              >
                <ArrowRightToBracketOutline class="w-4 h-4" />
                Sair
              </button>
            </div>
          </NavLi>
        {:else if loadingUser}
          <NavLi class="text-xs font-bold uppercase tracking-[0.2em] px-4 py-2 text-neutral-500 animate-pulse">
            Carregando...
          </NavLi>
        {:else}
          <NavLi href="/login" nonActiveClass="text-base font-bold uppercase tracking-[0.2em] px-4 py-2 text-neutral-200 hover:text-amber-500 transition-all duration-300 rounded-none">
            Login
          </NavLi>
        {/if}
      {:else}
        <!-- Botão Login no formato bloco "Statement" igual aos botões grandões da Cafuné -->
        <NavLi href="/login" nonActiveClass="text-sm font-bold uppercase tracking-[0.25em] px-8 py-3.5 bg-amber-600 hover:bg-amber-700 text-neutral-950 transition-all duration-300 rounded-none shadow-2xl block md:inline-block text-center hover:-translate-y-0.5">
          Login
        </NavLi>
      {/if}
      
    </NavUl>
  </Navbar>
</div>