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

<main class="pt-36 pb-20 px-4 sm:px-6 lg:px-8 relative z-30 flex justify-center">
  <div class="w-full max-w-md bg-primary-900/90 backdrop-blur-xl border border-primary-700/60 shadow-2xl rounded-2xl p-6 sm:p-10 flex flex-col gap-6">
    
    <div class="flex flex-col items-center text-center border-b border-primary-800 pb-5 gap-1.5">
      <span class="text-[10px] font-bold uppercase tracking-[0.25em] text-tertiary-400">Acesso ao Refúgio</span>
      <h2 class="text-xl sm:text-2xl font-black tracking-wider text-primary-50 font-serif">
        Login
      </h2>
    </div>

    {#if error}
      <div class="text-xs font-medium tracking-wide text-red-300 bg-red-950/60 p-4 rounded-xl border border-red-900/50 flex items-center gap-2">
        <span>⚠️</span> {error}
      </div>
    {/if}

    <form on:submit|preventDefault={handleLogin} class="flex flex-col gap-5">
      
      <div class="flex flex-col gap-1.5">
        <Label for="login" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Usuário ou E-mail</Label>
        <Input
          class="w-full text-primary-50 bg-primary-950/40 border border-primary-700 rounded-xl p-3 text-xs focus:outline-none focus:border-tertiary-500 transition-colors"
          id="login"
          type="text"
          bind:value={login}
          placeholder="Digite seu usuário ou e-mail"
          required
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <Label for="password" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Senha</Label>
        <Input
          class="w-full text-primary-50 bg-primary-950/40 border border-primary-700 rounded-xl p-3 text-xs focus:outline-none focus:border-tertiary-500 transition-colors"
          id="password"
          type="password"
          bind:value={password}
          placeholder="Digite sua senha"
          required
        />
      </div>

      <div class="flex flex-col gap-3 mt-4 pt-4 border-t border-primary-800">
        <Button 
          type="submit"
          class="w-full py-3 bg-tertiary-600 hover:bg-tertiary-500 text-primary-950 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors shadow-md"
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
          
        <div class="text-center pt-1">
          <a href="/users/new" class="text-[10px] font-bold uppercase tracking-widest text-primary-300 hover:text-tertiary-400 transition-colors no-underline">
            Não tem uma conta? <span class="text-tertiary-400 underline underline-offset-4">Cadastre-se</span>
          </a>
        </div>
      </div>
    </form>
  </div>
</main>

<style>
  :global(input::placeholder) {
    color: #C0AA9B !important; 
    opacity: 0.6 !important; 
  }

  /* Mantém o fundo translúcido original do input durante o autofill */
  :global(input:-webkit-autofill),
  :global(input:-webkit-autofill:hover),
  :global(input:-webkit-autofill:focus),
  :global(input:-webkit-autofill:active) {
    -webkit-box-shadow: 0 0 0 30px rgba(16, 12, 10, 0.4) inset !important;
    -webkit-text-fill-color: #F5F2EF !important;
    transition: background-color 5000s ease-in-out 0s;
  }
</style>