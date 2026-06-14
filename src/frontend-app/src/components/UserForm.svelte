<script lang="ts">
  // Formulário de usuário
  import { Card, Button, Label, Input, Heading, Select } from 'flowbite-svelte'; // UI
  import { onMount } from 'svelte'; // ciclo de vida
  import api from '$lib/api'; // API backend
  import type { ApiFieldError, ApiResponse } from '$lib/api';
  import { goto } from '$app/navigation'; // navegação
  import { ArrowLeftOutline, FloppyDiskAltOutline } from 'flowbite-svelte-icons'; // ícones
  import type { User, UserFormData } from '$lib/models/User';

  export let id: number | null = null; // id do usuário

  let user: UserFormData = { id: 0, login: '', email: '', senha: '', confirmarSenha:'', cpf: '', dat_nas: '', num_tel: '', role: 'user' }; // dados do form
  
  const roleOptions = [
    { value: 'user', name: 'Usuário' },
    { value: 'admin', name: 'Administrador' }
  ]; 
  let loading = false;
  let error = '';
  let fieldErrors: ApiFieldError[] = [];
  let currentUser = {role: 'admin'};

  function errorOf(field: string): string | null {
    return fieldErrors.find((item) => item.field === field)?.message ?? null;
  }

  // Carrega usuário se for edição
  onMount(async () => {
    if (id !== null) {
      loading = true;
      try {
        const res = await api.get(`/users/${id}`);
        const body = res.data as ApiResponse<User>;
        if (body.success && body.data) {
          
          // Formata a data recebida para YYYY-MM-DD
          let dataFormatada = '';
          if (body.data.dat_nas) {
            dataFormatada = body.data.dat_nas.substring(0, 10);
          }

          user = { 
            ...body.data, 
            dat_nas: dataFormatada, 
            senha: '' 
          }; 
        } else {
          error = body.message;
        }
      } catch (e: any) {
        const body = e.response?.data as ApiResponse<User> | undefined;
        error = body?.message || 'Erro ao carregar usuário.';
      } finally {
        loading = false;
      }
    } 
  });

  // Submissão do formulário
  async function handleSubmit() {
    fieldErrors = [];

    // Validação de senha
    if (id === null && (!user.senha || user.senha.length < 6)) {
      fieldErrors = [{ field: 'senha', message: 'Senha deve ter pelo menos 6 caracteres.' }];
      error = 'Senha deve ter pelo menos 6 caracteres.';
      return;
    }
    
    if (id !== null && user.senha && user.senha.length < 6) {
      fieldErrors = [{ field: 'senha', message: 'Senha deve ter pelo menos 6 caracteres.' }];
      error = 'Senha deve ter pelo menos 6 caracteres.';
      return;
    }

    loading = true;
    error = '';
    try {
      const userData = { ...user };
      if (id !== null && !userData.senha) {
        delete userData.senha;
      }
      
      if (id === null) {
        const res = await api.post('/users', userData);
        const body = res.data as ApiResponse<User>;
        if (!body.success) {
          error = body.message;
          fieldErrors = body.errors;
          return;
        }
      } else {
        const res = await api.put(`/users/${id}`, userData);
        const body = res.data as ApiResponse<User>;
        if (!body.success) {
          error = body.message;
          fieldErrors = body.errors;
          return;
        }
      }
      goto('/users');
    } catch (e: any) {
      const body = e.response?.data as ApiResponse<User> | undefined;
      error = body?.message || 'Erro ao salvar usuário.';
      fieldErrors = body?.errors || [];
    } finally {
      loading = false;
    }
  }
</script>

<div class="fixed inset-0 bg-neutral-950/20 backdrop-blur-md z-20 pointer-events-none"></div>

<Card class="relative z-30 max-w-sm mx-auto mt-40 mb-12 p-0 overflow-hidden shadow-2xl border border-primary-350 bg-primary-350/90 rounded-none">
  <form class="flex flex-col gap-3.5 p-5" on:submit|preventDefault={handleSubmit}>
    
    <div class="text-center mb-1 flex flex-col items-center gap-2">      
      <Heading tag="h4" class="text-lg font-black tracking-[0.15em] uppercase font-serif text-secondary-600">
        {id === null ? 'Cadastrar Usuário' : 'Editar Usuário'}
      </Heading>
      <div class="w-10 h-[1px] bg-neutral-800/20 mt-0.5"></div>
    </div>

    {#if error}
      <div class="p-2.5 bg-red-950/20 border border-red-900/40 text-red-400 text-xs tracking-wide text-center rounded-none">{error}</div>
    {/if}

    <div>
      <Label for="login" class="text-[10px] font-bold tracking-widest text-primary-900 uppercase mb-0.5 block">Nome de Usuário</Label>
      <Input id="login" bind:value={user.login} placeholder="Digite o Nome do usuário" required class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600 focus:ring-0" />
      {#if errorOf('login')}
        <div class="mt-0.5 text-[11px] text-red-400 tracking-wide">{errorOf('login')}</div>
      {/if}
    </div>

    <div>
      <Label for="email" class="text-[10px] font-bold tracking-widest text-primary-900 uppercase mb-0.5 block">Email</Label>
      <Input id="email" type="email" bind:value={user.email} placeholder="Digite o e-mail" required class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600 focus:ring-0" />
      {#if errorOf('email')}
        <div class="mt-0.5 text-[11px] text-red-400 tracking-wide">{errorOf('email')}</div>
      {/if}
    </div>

    <div>
      <Label for="senha" class="text-[10px] font-bold tracking-widest text-primary-900 uppercase mb-0.5 block">
        Senha {id !== null ? '(opcional)' : ''}
      </Label>
      <Input 
        id="senha" 
        type="password" 
        bind:value={user.senha} 
        placeholder={id === null ? 'Mínimo 6 caracteres' : 'Deixe vazio para manter'} 
        required={id === null}
        minlength={6}
        class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600 focus:ring-0" 
      />
      {#if errorOf('senha')}
        <div class="mt-0.5 text-[11px] text-red-400 tracking-wide">{errorOf('senha')}</div>
      {/if}
    </div>

    {#if id === null}
    <div>
      <Label for="confirmarSenha" class="text-[10px] font-bold tracking-widest text-primary-900 uppercase mb-0.5 block">Confirmar Senha</Label>
      <Input
        id="confirmarSenha"
        type="password"
        bind:value={user.confirmarSenha}
        placeholder="Confirme a senha"
        class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600 focus:ring-0"
      />
      {#if errorOf('confirmarSenha')}
        <div class="mt-0.5 text-[11px] text-red-400 tracking-wide">{errorOf('confirmarSenha')}</div>
      {/if}
    </div>
    {/if}

    <div>
      <Label for="cpf" class="text-[10px] font-bold tracking-widest text-primary-900 uppercase mb-0.5 block">CPF</Label>
      <Input
        id="cpf"
        bind:value={user.cpf}
        placeholder="000.000.000-00"      
        required
        class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600 focus:ring-0"
      />
      {#if errorOf('cpf')}
        <div class="mt-0.5 text-[11px] text-red-400 tracking-wide">{errorOf('cpf')}</div>
      {/if}
    </div>

    <div>
      <Label for="dat_nas" class="text-[10px] font-bold tracking-widest text-primary-900 uppercase mb-0.5 block">Data de Nascimento</Label>
      <Input
        id="dat_nas"
        type="date"
        bind:value={user.dat_nas}
        required
        class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600 focus:ring-0"
      />
      {#if errorOf('dat_nas')}
        <div class="mt-0.5 text-[11px] text-red-400 tracking-wide">{errorOf('dat_nas')}</div>
      {/if}
    </div>

    <div>
      <Label for="num_tel" class="text-[10px] font-bold tracking-widest text-primary-900 uppercase mb-0.5 block">Telefone</Label>
      <Input
        id="num_tel"
        bind:value={user.num_tel}
        placeholder="(00) 90000-0000"
        required
        class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600 focus:ring-0"
      />
      {#if errorOf('num_tel')}
        <div class="mt-0.5 text-[11px] text-red-400 tracking-wide">{errorOf('num_tel')}</div>
      {/if}
    </div>

    {#if id !== null && currentUser.role === 'admin'}
      <div>
        <Label for="role" class="text-[10px] font-bold tracking-widest text-primary-900 uppercase mb-0.5 block">Perfil de Acesso</Label>
        <Select 
          id="role" 
          bind:value={user.role} 
          items={roleOptions} 
          class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600 focus:ring-0"
        />
        {#if errorOf('role')}
          <div class="mt-0.5 text-[11px] text-red-400 tracking-wide">{errorOf('role')}</div>
        {/if}
      </div>
    {/if}

    <div class="flex gap-2.5 justify-end mt-2">
      <a 
        href="/users"
        class="inline-flex items-center justify-center bg-transparent border border-primary-500 hover:border-neutral-800 hover:bg-neutral-800/10 text-primary-900 font-bold uppercase tracking-widest text-[10px] px-3 py-2 rounded-none transition-all duration-300 no-underline select-none"
      >
        <ArrowLeftOutline class="inline w-3 h-3 mr-1" />
        {id === null ? 'Voltar' : 'Cancelar'}
      </a>
      
      <Button 
        type="submit" 
        disabled={loading}
        class="bg-transparent border border-amber-600 hover:bg-amber-600 text-amber-700 hover:text-neutral-950 font-bold uppercase tracking-widest text-[10px] px-3 py-2 rounded-none transition-all duration-300"
      >
        <FloppyDiskAltOutline class="inline w-3 h-3 mr-1 align-text-bottom" />
        {id === null ? 'Cadastrar' : 'Salvar'}
      </Button>
    </div>
  </form>
</Card>

<style>
  :global(input::placeholder) {
    color: #C47B54 !important; 
    opacity: 0.7 !important; 
  }
</style>