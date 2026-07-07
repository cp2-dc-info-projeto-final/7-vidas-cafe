<script lang="ts">
  import { Card, Button, Input, Label } from "flowbite-svelte";
  import { goto } from "$app/navigation";
  import { login as authLogin } from "$lib/auth";
  
  let login = '';
  let password = '';
  let loading = false;
  let error = '';

  async function handleLogin() {
    if (!login || !password) {
      error = 'Por favor, preencha todos os campos';
      return;
    }

    loading = true;
    error = '';

    try {
      const result = await authLogin({ login, password });
      
      if (result.success) {
        await goto('/');
      } else {
        error = result.message || 'Credenciais inválidas';
      }
    } catch (err) {
      error = 'Erro interno do servidor';
      console.error('Erro no login:', err);
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Sete Vidas Café</title>
</svelte:head>

<div class="fixed inset-0 bg-neutral-950/20 backdrop-blur-md z-30 pointer-events-none"></div>

<div class="min-h-screen w-full bg-transparent flex flex-col items-center justify-center p-4 relative overflow-hidden z-40">
  
  <div class="w-full max-w-sm mt-40 mb-12">
    
    <div class="text-center mb-6 flex flex-col items-center">
      <span class="text-xs font-bold tracking-[0.4em] text-amber-500 uppercase block mb-2">Acesso ao Refúgio</span>
      <h2 class="text-3xl font-black tracking-[0.2em] text-secondary-600 uppercase font-serif">
        Login
      </h2>
      <div class="w-12 h-[1px] bg-neutral-800/40 mt-3"></div>
    </div>
    
    <Card class="p-8 w-full bg-primary-350/90 border border-primary-350 rounded-none shadow-2xl">
      <form on:submit|preventDefault={handleLogin} class="space-y-6">
        
        <div>
          <Label for="login" class="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary-900 block">Nome de Usuário</Label>
          <Input
            class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600 focus:ring-0 custom-placeholder"
            id="login"
            type="text"
            bind:value={login}
            placeholder="Digite seu nome de usuário"
            required
          />
        </div>

        <div>
          <Label for="password" class="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary-900 block">Senha</Label>
          <Input
            class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600 focus:ring-0 custom-placeholder"
            id="password"
            type="password"
            bind:value={password}
            placeholder="Digite sua senha"
            required
          />
        </div>

        {#if error}
          <div class="p-2.5 bg-red-100 border border-red-900/40 text-red-600 text-xs tracking-wide text-center rounded-none">
            {error}
          </div>
        {/if}

        <Button 
          type="submit"
          class="w-full bg-tertiary-200 border border-amber-700 hover:bg-amber-600 text-amber-800 hover:text-neutral-950 font-bold uppercase tracking-widest text-[10px] py-3 rounded-none transition-all duration-300" 
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
          
        <div class="text-center pt-2">
          <a href="/users/new" class="text-[10px] font-bold uppercase tracking-widest text-primary-900 hover:text-amber-600 transition-colors duration-300 relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-amber-600 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 no-underline">
            Cadastre-se
          </a>
        </div>
      </form>
    </Card>
  </div>
</div>

<style>
  /* Escopa o placeholder em uma classe específica para não herdar efeitos de hover de outros elementos */
  :global(.custom-placeholder::placeholder) {
    color: #9b4b06 !important; 
    opacity: 1 !important;
  }
</style>