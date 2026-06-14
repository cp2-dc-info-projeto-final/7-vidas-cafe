<script lang="ts">
  // Tabela de usuários
  import { Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Card, Badge } from 'flowbite-svelte'; 
  import ConfirmModal from './ConfirmModal.svelte'; 
  import { UserEditOutline, TrashBinOutline } from 'flowbite-svelte-icons'; 
  import { goto } from '$app/navigation'; 
  import api from '$lib/api'; 
  import type { ApiResponse } from '$lib/api';
  import { onMount } from 'svelte'; 
  import type { User } from '$lib/models/User';

  let users: User[] = []; 
  let loading = true;
  let error = '';
  let deletingId: number | null = null; 
  let confirmOpen = false; 
  let confirmTargetId: number | null = null; 
  let filtro = '';

  function openConfirm(id: number) {
    confirmTargetId = id;
    confirmOpen = true;
  }

  function closeConfirm() {
    confirmOpen = false;
    confirmTargetId = null;
    deletingId = null; 
  }

  function handleConfirm() {
    if (confirmTargetId !== null) {
      handleDelete(confirmTargetId);
    }
    confirmOpen = false;
    confirmTargetId = null;
  }

  function handleCancel() {
    closeConfirm();
  }

  async function handleDelete(id: number) {
    deletingId = id;
    error = '';
    try {
      const res = await api.delete(`/users/${id}`);
      const body = res.data as ApiResponse<null>;
      if (!body.success) {
        error = body.message; // O erro do user.js (backend) será exibido aqui
        return;
      }
      users = users.filter(user => user.id !== id);
    } catch (e: any) {
      console.error('Erro ao deletar usuário:', e);
      const body = e.response?.data as ApiResponse<null> | undefined;
      error = body?.message || 'Erro ao remover usuário.';
    } finally {
      deletingId = null;
    }
  }

  onMount(async () => {
    try {
      const res = await api.get('/users');
      const body = res.data as ApiResponse<User[]>;
      if (body.success) {
        users = body.data ?? [];
      } else {
        error = body.message;
      }
    } catch (e: any) {
      console.error('Erro ao carregar usuários:', e);
      const body = e.response?.data as ApiResponse<User[]> | undefined;
      error = body?.message || 'Erro ao carregar usuários';
    } finally {
      loading = false;
    }
  });

  $: filtro, buscarUsuarios();

  async function buscarUsuarios() {
    if(filtro !== '') {
      try {
        const res = await api.get(`/users/nome/${encodeURIComponent(filtro)}`);
        users = res.data.data ?? [];
      } catch (e: any) {
        console.error('Erro ao buscar usuários:', e);
      }
    } else {
        const res = await api.get('/users');
        users = res.data.data ?? [];
    }
  }
</script>

{#if loading}
  <div class="my-8 text-center text-neutral-400 font-medium uppercase tracking-widest animate-pulse">Carregando usuários...</div>
{:else if error}
  <div class="my-8 text-center text-red-500 font-semibold text-sm tracking-wide max-w-xl mx-auto bg-red-950/10 p-3 border border-red-900/35">{error}</div>
{:else}
  <div class="max-w-7xl mx-auto mt-8 mb-4">
    <input
      type="text"
      placeholder="Pesquisar Usuário"
      style="padding: 12px; width: 300px; display: flex;"
      class="bg-tertiary-100 border border-black rounded-none text-neutral-900 text-sm tracking-wide focus:outline-none focus:border-amber-600 focus:ring-0"
      bind:value={filtro}
    />
  </div>

  <style>
    input::placeholder {
      color: #C47B54; 
      opacity: 1; 
    }
  </style>

  <div class="hidden xl:block max-w-7xl">
    <Table class="w-full max-w-7xl mx-auto my-8 shadow-2xl border-primary-350 bg-primary-350/80 backdrop-blur-lg rounded-none border border-separate overflow-hidden">
      <TableHead class="border-b border-neutral-800/20 bg-transparent">
        <TableHeadCell class="text-primary-900 w-16 bg-transparent text-xs font-bold uppercase tracking-wider py-4">ID</TableHeadCell>
        <TableHeadCell class="text-primary-900 w-32 bg-transparent text-xs font-bold uppercase tracking-wider py-4">Login</TableHeadCell>
        <TableHeadCell class="text-primary-900 min-w-0 bg-transparent text-xs font-bold uppercase tracking-wider py-4">Email</TableHeadCell>
        <TableHeadCell class="text-primary-900 min-w-0 bg-transparent text-xs font-bold uppercase tracking-wider py-4">CPF</TableHeadCell>
        <TableHeadCell class="text-primary-900 min-w-0 bg-transparent text-xs font-bold uppercase tracking-wider py-4">Celular</TableHeadCell>
        <TableHeadCell class="text-primary-900 min-w-0 bg-transparent text-xs font-bold uppercase tracking-wider py-4">Data Nascimento</TableHeadCell>
        <TableHeadCell class="text-primary-900 w-20 bg-transparent text-xs font-bold uppercase tracking-wider py-4">Role</TableHeadCell>
        <TableHeadCell class="w-24 bg-transparent py-4"></TableHeadCell> 
      </TableHead>
      <TableBody>
        {#each users as user}
          <TableBodyRow class="bg-tertiary-200/50 hover:bg-tertiary-200 transition-colors border-b border-primary-350/40 last:border-b-0">
            <TableBodyCell class="text-primary-700 text-sm font-medium py-4">{user.id}</TableBodyCell>
            <TableBodyCell class="text-primary-700 text-sm font-semibold py-4">{user.login}</TableBodyCell>
            <TableBodyCell class="truncate max-w-64 text-primary-700 text-sm py-4">{user.email}</TableBodyCell>
            <TableBodyCell class="text-primary-700 text-sm py-4">{user.cpf}</TableBodyCell>
            <TableBodyCell class="text-primary-700 text-sm py-4">{user.num_tel}</TableBodyCell>
            <TableBodyCell class="text-primary-700 text-sm py-4">{new Date(user.dat_nas).toLocaleDateString('pt-BR')}</TableBodyCell>
            <TableBodyCell class="py-4">
              <Badge class="bg-neutral-950 text-amber-500 border border-neutral-800/60 rounded-none text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                {user.role}
              </Badge>
            </TableBodyCell>
            <TableBodyCell class="py-4">
              <div class="flex items-center gap-2">
                <button
                  class="p-2 rounded-none border border-primary-500 hover:border-amber-600 hover:bg-amber-600 group transition-all duration-300"
                  title="Editar"
                  on:click={() => goto(`/users/edit/${user.id}`)}>
                  <UserEditOutline class="w-4 h-4 text-primary-500 group-hover:text-neutral-950 transition-colors" />
                </button>
                <button
                  title="Remover"
                  class="p-2 rounded-none border border-primary-500 hover:border-red-500 hover:bg-red-600 group transition-all duration-300"
                  on:click={() => openConfirm(user.id)}
                  disabled={deletingId === user.id || loading}
                >
                  <TrashBinOutline class="w-4 h-4 text-red-400 group-hover:text-white transition-colors" />
                </button>
              </div>
            </TableBodyCell>
          </TableBodyRow>
        {/each}
      </TableBody>
    </Table>
  </div>

  <div class="block xl:hidden px-4">
    <div class="flex flex-col items-center gap-4 my-8 max-w-3xl mx-auto md:grid md:grid-cols-2">
      {#each users as user}
        <Card class="max-w-sm w-full p-0 overflow-hidden shadow-xl border bg-primary-350/80 backdrop-blur-lg border-primary-400 rounded-none flex flex-col">
          <div class="px-4 pt-4 pb-3 text-left flex items-center justify-between bg-tertiary-200/60 border-b border-primary-400/50">
            <div>
              <div class="text-base font-bold text-primary-700 text-left">{user.login}</div>
              <div class="text-[11px] text-primary-900/70 text-left font-mono mt-0.5">ID: {user.id}</div>
              <Badge class="bg-neutral-950 text-amber-500 border border-neutral-800/60 rounded-none text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 mt-1.5 inline-block">
                {user.role}
              </Badge>
            </div>
            <div class="flex gap-2">
              <button
                class="p-2 rounded-none border border-primary-500 hover:border-amber-600 hover:bg-amber-600 group transition-all duration-300"
                title="Editar"
                on:click={() => goto(`/users/edit/${user.id}`)}
              >
                <UserEditOutline class="w-4 h-4 text-primary-900 group-hover:text-neutral-950" />
              </button>
              <button
                title="Remover"
                class="p-2 rounded-none border border-primary-500 hover:border-red-500 hover:bg-red-600 group transition-all duration-300"
                on:click={() => openConfirm(user.id)}
                disabled={deletingId === user.id || loading}
              >
                <TrashBinOutline class="w-4 h-4 text-red-400 group-hover:text-white" />
              </button>
            </div>
          </div>

          <div class="px-4 pb-4 pt-3 flex flex-col gap-2.5 text-left bg-transparent">
            <div class="flex items-center gap-2.5 text-left">
              <svg class="w-4 h-4 text-primary-700 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <span class="text-primary-900 text-sm tracking-wide truncate">{user.email}</span>
            </div>

            <div class="flex items-center gap-2.5 text-left">
              <svg class="w-4 h-4 text-primary-700 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.333 0 4 .667 4 2v1H5v-1c0-1.333 2.667-2 4-2z"/>
              </svg>
              <span class="text-primary-900 text-sm tracking-wide"><strong class="text-[10px] uppercase font-bold tracking-wider opacity-75 mr-1">CPF:</strong> {user.cpf}</span>
            </div>

            <div class="flex items-center gap-2.5 text-left">
              <svg class="w-4 h-4 text-primary-700 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              <span class="text-primary-900 text-sm tracking-wide">{user.num_tel || 'Não informado'}</span>
            </div>

            <div class="flex items-center gap-2.5 text-left">
              <svg class="w-4 h-4 text-primary-700 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <span class="text-primary-900 text-sm tracking-wide">{new Date(user.dat_nas).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </Card>
      {/each}
    </div>
  </div>
{/if}

<ConfirmModal
  open={confirmOpen}
  message="Tem certeza que deseja remover este usuário?"
  confirmText="Remover"
  cancelText="Cancelar"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
/>