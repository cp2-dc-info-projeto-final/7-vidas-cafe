<script lang="ts">
  // Formulário de usuário - Refinado com o background de modal
  import { Card, Button, Label, Input, Heading, Select } from 'flowbite-svelte'; 
  import { onMount } from 'svelte'; 
  import api from '$lib/api'; 
  import type { ApiFieldError, ApiResponse } from '$lib/api';
  import { goto } from '$app/navigation'; 
  import { ArrowLeftOutline, FloppyDiskAltOutline } from 'flowbite-svelte-icons'; 
  import type { User, UserFormData } from '$lib/models/User';

  export let id: number | null = null; 

  let user: UserFormData = { id: 0, login: '', email: '', senha: '', confirmarSenha:'', cpf: '', dat_nas: '', num_tel: '', role: 'user' }; 
  
  const roleOptions = [
    { value: 'user', name: 'Usuário' },
    { value: 'admin', name: 'Administrador' }
  ]; 
  let loading = false;
  let error = '';
  let fieldErrors: ApiFieldError[] = [];
  let currentUser = { role: 'admin' }; 

  const hoje = new Date();
  const dataLimite16Anos = new Date(hoje.getFullYear() - 16, hoje.getMonth(), hoje.getDate())
    .toISOString()
    .split('T')[0];

  function errorOf(field: string): string | null {
    return fieldErrors.find((item) => item.field === field)?.message ?? null;
  }

  onMount(async () => {
    if (id !== null) {
      loading = true;
      try {
        const res = await api.get(`/users/${id}`);
        const body = res.data as ApiResponse<User>;
        if (body.success && body.data) {
          let dataFormatada = '';
          if (body.data.dat_nas) {
            dataFormatada = body.data.dat_nas.substring(0, 10);
          }

          user = { 
            ...body.data, 
            dat_nas: dataFormatada, 
            senha: '',
            confirmarSenha: ''
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

  async function handleSubmit() {
    fieldErrors = [];
    error = '';

    if (user.login.trim().length < 3) {
      fieldErrors = [{ field: 'login', message: 'O nome de usuário deve conter pelo menos 3 caracteres.' }];
      error = 'Corrija os erros do formulário.';
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|hotmail|outlook|yahoo|icloud|live)\.(com|com\.br)$/i;
    if (!emailRegex.test(user.email.trim())) {
      fieldErrors = [{ field: 'email', message: 'Insira um e-mail válido (Ex: nome@gmail.com, nome@outlook.com).' }];
      error = 'Provedor de e-mail não aceito ou formato inválido.';
      return;
    }

    if (id === null) { 
      if (!user.senha || user.senha.length < 6) {
        fieldErrors = [{ field: 'senha', message: 'A senha deve ter pelo menos 6 caracteres.' }];
        error = 'Senha muito curta.';
        return;
      }
      if (user.senha !== user.confirmarSenha) {
        fieldErrors = [{ field: 'confirmarSenha', message: 'As senhas não coincidem.' }];
        error = 'As senhas não coincidem.';
        return;
      }
    } else { 
      if (user.senha && user.senha.length < 6) {
        fieldErrors = [{ field: 'senha', message: 'A nova senha deve ter pelo menos 6 caracteres.' }];
        error = 'Senha muito curta.';
        return;
      }
    }

    const cpfRegex = /^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/;
    if (!cpfRegex.test(user.cpf.trim())) {
      fieldErrors = [{ field: 'cpf', message: 'Use o padrão numérico puro (11 dígitos) ou formatado (123.456.789-00).' }];
      error = 'CPF inválido.';
      return;
    }

    if (user.dat_nas) {
      const dataSelecionada = new Date(user.dat_nas);
      const dataMinima = new Date('1900-01-01');
      const dataAtual = new Date();

      if (dataSelecionada < dataMinima) {
        fieldErrors = [{ field: 'dat_nas', message: 'A data não pode ser anterior a 01/01/1900.' }];
        error = 'Data inválida.';
        return;
      }

      let idade = dataAtual.getFullYear() - dataSelecionada.getFullYear();
      const mes = dataAtual.getMonth() - dataSelecionada.getMonth();
      if (mes < 0 || (mes === 0 && dataAtual.getDate() < dataSelecionada.getDate())) {
        idade--;
      }

      if (idade < 16) {
        fieldErrors = [{ field: 'dat_nas', message: 'Cadastro permitido apenas para maiores de 16 anos.' }];
        error = 'Usuário é menor de idade.';
        return;
      }
    }

    const telRegex = /^\((1[1-9]|[2-9][1-9])\)(9[2-9]\d{3}|[2-5]\d{3})-\d{4}$/;
    if (!telRegex.test(user.num_tel.trim())) {
      const digitos = user.num_tel.replace(/\D/g, '');
      let msg = 'Formato de telefone incorreto. Use o padrão: (21)92345-6789.';
      if (digitos.length < 10 || digitos.length > 11) {
        msg = 'O telefone deve possuir 10 (fixo) ou 11 (celular) dígitos com o DDD.';
      } else if (digitos.length === 11 && digitos[2] !== '9') {
        msg = 'Números celulares de 9 dígitos devem iniciar obrigatoriamente com 9.';
      }
      fieldErrors = [{ field: 'num_tel', message: msg }];
      error = 'Telefone inválido.';
      return;
    }

    loading = true;
    try {
      const userData = { ...user };
      if (id !== null && !userData.senha) {
        delete userData.senha;
        delete userData.confirmarSenha;
      }
      
      if (id === null) {
        const res = await api.post('/users', userData);
        const body = res.data as ApiResponse<User>;
        if (!body.success) {
          error = body.message;
          fieldErrors = body.errors || [];
          return;
        }
      } else {
        const res = await api.put(`/users/${id}`, userData);
        const body = res.data as ApiResponse<User>;
        if (!body.success) {
          error = body.message;
          fieldErrors = body.errors || [];
          return;
        }
      }
      goto('/users');
    } catch (e: any) {
      const body = e.response?.data as ApiResponse<User> | undefined;
      error = body?.message || 'Erro ao salvar alterações no servidor.';
      fieldErrors = body?.errors || [];
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Sete Vidas Café</title>
</svelte:head>

<!-- Overlay de blur fixo que não bloqueia o ponteiro nem o scroll da página -->
<div class="fixed inset-0 bg-primary-950/60 backdrop-blur-md pointer-events-none z-30"></div>

<main class="pt-36 pb-20 px-4 sm:px-6 lg:px-8 relative z-40 flex justify-center min-h-screen">
  <div class="w-full max-w-lg bg-primary-900 border border-primary-700 shadow-2xl rounded-2xl p-6 sm:p-10 flex flex-col gap-6 h-fit my-auto">
    
    <div class="flex items-center justify-between border-b border-primary-800 pb-5 gap-4">
      <div>
        <span class="text-[10px] font-bold uppercase tracking-[0.25em] text-tertiary-400 block mb-1">Painel do Administrador</span>
        <h2 class="text-xl sm:text-2xl font-black tracking-wider text-white font-serif">
          {id === null ? 'Cadastrar Usuário' : 'Editar Usuário'}
        </h2>
      </div>
    </div>

    {#if error}
      <div class="text-xs font-medium tracking-wide text-red-300 bg-red-950/60 backdrop-blur-md p-4 rounded-xl border border-red-900/50 flex items-center gap-2">
        <span>⚠️</span> {error}
      </div>
    {/if}

    <form class="flex flex-col gap-5" on:submit|preventDefault={handleSubmit}>
      
      <div class="flex flex-col gap-1.5">
        <Label for="login" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Nome de Usuário</Label>
        <Input id="login" bind:value={user.login} placeholder="Mínimo 3 caracteres" required class="w-full text-primary-50 bg-primary-950/40 backdrop-blur-md border border-primary-700 rounded-xl p-3 text-xs focus:outline-none focus:border-tertiary-500 transition-colors" />
        {#if errorOf('login')}
          <div class="text-[11px] text-red-300 font-medium tracking-wide mt-1">{errorOf('login')}</div>
        {/if}
      </div>

      <div class="flex flex-col gap-1.5">
        <Label for="email" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Email</Label>
        <Input id="email" type="email" bind:value={user.email} placeholder="nome@provedor.com" required class="w-full text-primary-50 bg-primary-950/40 backdrop-blur-md border border-primary-700 rounded-xl p-3 text-xs focus:outline-none focus:border-tertiary-500 transition-colors" />
        {#if errorOf('email')}
          <div class="text-[11px] text-red-300 font-medium tracking-wide mt-1">{errorOf('email')}</div>
        {/if}
      </div>

      <div class="flex flex-col gap-1.5">
        <Label for="senha" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">
          Senha {id !== null ? '(opcional)' : ''}
        </Label>
        <Input 
          id="senha" 
          type="password" 
          bind:value={user.senha} 
          placeholder={id === null ? 'Mínimo 6 caracteres' : 'Deixe vazio para manter'} 
          required={id === null}
          class="w-full text-primary-50 bg-primary-950/40 backdrop-blur-md border border-primary-700 rounded-xl p-3 text-xs focus:outline-none focus:border-tertiary-500 transition-colors" 
        />
        {#if errorOf('senha')}
          <div class="text-[11px] text-red-300 font-medium tracking-wide mt-1">{errorOf('senha')}</div>
        {/if}
      </div>

      {#if id === null}
      <div class="flex flex-col gap-1.5">
        <Label for="confirmarSenha" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Confirmar Senha</Label>
        <Input
          id="confirmarSenha"
          type="password"
          bind:value={user.confirmarSenha}
          placeholder="Confirme a senha digitada"
          required
          class="w-full text-primary-50 bg-primary-950/40 backdrop-blur-md border border-primary-700 rounded-xl p-3 text-xs focus:outline-none focus:border-tertiary-500 transition-colors"
        />
        {#if errorOf('confirmarSenha')}
          <div class="text-[11px] text-red-300 font-medium tracking-wide mt-1">{errorOf('confirmarSenha')}</div>
        {/if}
      </div>
      {/if}

      <div class="flex flex-col gap-1.5">
        <Label for="cpf" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">CPF</Label>
        <Input
          id="cpf"
          bind:value={user.cpf}
          placeholder="123.456.789-00"    
          required
          class="w-full text-primary-50 bg-primary-950/40 backdrop-blur-md border border-primary-700 rounded-xl p-3 text-xs focus:outline-none focus:border-tertiary-500 transition-colors"
        />
        {#if errorOf('cpf')}
          <div class="text-[11px] text-red-300 font-medium tracking-wide mt-1">{errorOf('cpf')}</div>
        {/if}
      </div>

      <div class="flex flex-col gap-1.5">
        <Label for="dat_nas" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Data de Nascimento</Label>
        <Input
          id="dat_nas"
          type="date"
          min="1900-01-01"
          max={dataLimite16Anos}
          bind:value={user.dat_nas}
          required
          class="w-full text-primary-50 bg-primary-950/40 backdrop-blur-md border border-primary-700 rounded-xl p-3 text-xs focus:outline-none focus:border-tertiary-500 transition-colors"
        />
        {#if errorOf('dat_nas')}
          <div class="text-[11px] text-red-300 font-medium tracking-wide mt-1">{errorOf('dat_nas')}</div>
        {/if}
      </div>

      <div class="flex flex-col gap-1.5">
        <Label for="num_tel" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Telefone</Label>
        <Input
          id="num_tel"
          bind:value={user.num_tel}
          placeholder="(21)92345-6789"
          required
          class="w-full text-primary-50 bg-primary-950/40 backdrop-blur-md border border-primary-700 rounded-xl p-3 text-xs focus:outline-none focus:border-tertiary-500 transition-colors"
        />
        {#if errorOf('num_tel')}
          <div class="text-[11px] text-red-300 font-medium tracking-wide mt-1">{errorOf('num_tel')}</div>
        {/if}
      </div>

      {#if id !== null && currentUser.role === 'admin'}
        <div class="flex flex-col gap-1.5">
          <Label for="role" class="text-[10px] font-bold uppercase tracking-widest text-primary-300">Perfil de Acesso</Label>
          <Select 
            id="role" 
            bind:value={user.role} 
            items={roleOptions} 
            class="w-full text-primary-50 bg-primary-950/40 backdrop-blur-md border border-primary-700 rounded-xl p-3 text-xs focus:outline-none focus:border-tertiary-500 transition-colors"
          />
          {#if errorOf('role')}
            <div class="text-[11px] text-red-300 font-medium tracking-wide mt-1">{errorOf('role')}</div>
          {/if}
        </div>
      {/if}

      <div class="flex gap-3 justify-end mt-4 pt-4 border-t border-primary-800">
        <a 
          href="/users"
          class="px-4 py-2.5 bg-primary-800 hover:bg-primary-700 text-primary-100 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors inline-flex items-center justify-center no-underline select-none"
        >
          <ArrowLeftOutline class="inline w-3 h-3 mr-1.5" />
          {id === null ? 'Voltar' : 'Cancelar'}
        </a>
        
        <Button 
          type="submit" 
          disabled={loading}
          class="px-4 py-2.5 bg-tertiary-600 hover:bg-tertiary-500 text-primary-950 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors shadow-md"
        >
          <FloppyDiskAltOutline class="inline w-3 h-3 mr-1.5 align-text-bottom" />
          {loading ? 'Salvando...' : (id === null ? 'Cadastrar' : 'Salvar')}
        </Button>
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

  /* Padroniza o Select do Flowbite para manter o fundo e texto corretos */
  :global(select) {
    background-color: rgba(16, 12, 10, 0.4) !important;
    backdrop-filter: blur(12px);
    color: #F5F2EF !important;
  }

  :global(select option) {
    background-color: #100C0A !important;
    color: #F5F2EF !important;
  }
</style>