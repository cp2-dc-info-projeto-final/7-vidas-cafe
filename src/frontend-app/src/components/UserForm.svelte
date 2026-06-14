<script lang="ts">
  // Formulário de usuário - Refinado com as regras do Perfil
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
  let currentUser = { role: 'admin' }; // Pode ser alimentado dinamicamente pelo seu auth store

  // Restrição nativa de calendário para 18 anos atrás
  const hoje = new Date();
  const dataLimite18Anos = new Date(hoje.getFullYear() - 18, hoje.getMonth(), hoje.getDate())
    .toISOString()
    .split('T')[0];

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

  // Submissão do formulário
  async function handleSubmit() {
    fieldErrors = [];
    error = '';

    // --- VALIDAÇÕES RÍGIDAS DO FRONTEND ---
    
    // 1. Validar tamanho de Login
    if (user.login.trim().length < 3) {
      fieldErrors = [{ field: 'login', message: 'O nome de usuário deve conter pelo menos 3 caracteres.' }];
      error = 'Corrija os erros do formulário.';
      return;
    }

    // 2. Validar Provedor de E-mail
    const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|hotmail|outlook|yahoo|icloud|live)\.(com|com\.br)$/i;
    if (!emailRegex.test(user.email.trim())) {
      fieldErrors = [{ field: 'email', message: 'Insira um e-mail válido (Ex: nome@gmail.com, nome@outlook.com).' }];
      error = 'Provedor de e-mail não aceito ou formato inválido.';
      return;
    }

    // 3. Validar Senhas
    if (id === null) { // Modo Criação
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
    } else { // Modo Edição
      if (user.senha && user.senha.length < 6) {
        fieldErrors = [{ field: 'senha', message: 'A nova senha deve ter pelo menos 6 caracteres.' }];
        error = 'Senha muito curta.';
        return;
      }
    }

    // 4. Validar CPF estruturado
    const cpfRegex = /^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/;
    if (!cpfRegex.test(user.cpf.trim())) {
      fieldErrors = [{ field: 'cpf', message: 'Use o padrão numérico puro (11 dígitos) ou formatado (123.456.789-00).' }];
      error = 'CPF inválido.';
      return;
    }

    // 5. Validar Data de Nascimento (Maior de 18 anos e limite histórico de 1900)
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

      if (idade < 18) {
        fieldErrors = [{ field: 'dat_nas', message: 'Cadastro permitido apenas para maiores de 18 anos.' }];
        error = 'Usuário é menor de idade.';
        return;
      }
    }

    // 6. Validar Telefone/Celular estruturado
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

    // Envio dos dados para a API
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
      <Input id="login" bind:value={user.login} placeholder="Mínimo 3 caracteres" required class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600" />
      {#if errorOf('login')}
        <div class="mt-1 text-[11px] text-red-400 font-medium tracking-wide">{errorOf('login')}</div>
      {/if}
    </div>

    <div>
      <Label for="email" class="text-[10px] font-bold tracking-widest text-primary-900 uppercase mb-0.5 block">Email</Label>
      <Input id="email" type="email" bind:value={user.email} placeholder="nome@provedor.com" required class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600" />
      {#if errorOf('email')}
        <div class="mt-1 text-[11px] text-red-400 font-medium tracking-wide">{errorOf('email')}</div>
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
        class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600" 
      />
      {#if errorOf('senha')}
        <div class="mt-1 text-[11px] text-red-400 font-medium tracking-wide">{errorOf('senha')}</div>
      {/if}
    </div>

    {#if id === null}
    <div>
      <Label for="confirmarSenha" class="text-[10px] font-bold tracking-widest text-primary-900 uppercase mb-0.5 block">Confirmar Senha</Label>
      <Input
        id="confirmarSenha"
        type="password"
        bind:value={user.confirmarSenha}
        placeholder="Confirme a senha digitada"
        required
        class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600"
      />
      {#if errorOf('confirmarSenha')}
        <div class="mt-1 text-[11px] text-red-400 font-medium tracking-wide">{errorOf('confirmarSenha')}</div>
      {/if}
    </div>
    {/if}

    <div>
      <Label for="cpf" class="text-[10px] font-bold tracking-widest text-primary-900 uppercase mb-0.5 block">CPF</Label>
      <Input
        id="cpf"
        bind:value={user.cpf}
        placeholder="123.456.789-00"      
        required
        class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600"
      />
      {#if errorOf('cpf')}
        <div class="mt-1 text-[11px] text-red-400 font-medium tracking-wide">{errorOf('cpf')}</div>
      {/if}
    </div>

    <div>
      <Label for="dat_nas" class="text-[10px] font-bold tracking-widest text-primary-900 uppercase mb-0.5 block">Data de Nascimento</Label>
      <Input
        id="dat_nas"
        type="date"
        min="1900-01-01"
        max={dataLimite18Anos}
        bind:value={user.dat_nas}
        required
        class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600"
      />
      {#if errorOf('dat_nas')}
        <div class="mt-1 text-[11px] text-red-400 font-medium tracking-wide">{errorOf('dat_nas')}</div>
      {/if}
    </div>

    <div>
      <Label for="num_tel" class="text-[10px] font-bold tracking-widest text-primary-900 uppercase mb-0.5 block">Telefone</Label>
      <Input
        id="num_tel"
        bind:value={user.num_tel}
        placeholder="(21)92345-6789"
        required
        class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600"
      />
      {#if errorOf('num_tel')}
        <div class="mt-1 text-[11px] text-red-400 font-medium tracking-wide">{errorOf('num_tel')}</div>
      {/if}
    </div>

    {#if id !== null && currentUser.role === 'admin'}
      <div>
        <Label for="role" class="text-[10px] font-bold tracking-widest text-primary-900 uppercase mb-0.5 block">Perfil de Acesso</Label>
        <Select 
          id="role" 
          bind:value={user.role} 
          items={roleOptions} 
          class="w-full bg-tertiary-100 border border-black rounded-none p-2 text-xs text-neutral-900 focus:outline-none focus:border-amber-600"
        />
        {#if errorOf('role')}
          <div class="mt-1 text-[11px] text-red-400 font-medium tracking-wide">{errorOf('role')}</div>
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