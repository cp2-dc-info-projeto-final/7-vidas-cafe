<script lang="ts">
  // Tabela de usuários
  import { Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Card, Badge, input } from 'flowbite-svelte'; // UI
  import ConfirmModal from './ConfirmModal.svelte'; // modal de confirmação
  import { UserEditOutline, TrashBinOutline } from 'flowbite-svelte-icons'; // ícones
  import { goto } from '$app/navigation'; // navegação
  import api from '$lib/api'; // API backend
  import type { ApiResponse } from '$lib/api';
  import { onMount } from 'svelte'; // ciclo de vida
  import type { User } from '$lib/models/User';

  let users: User[] = []; // lista de usuários
  let loading = true;
  let error = '';
  let deletingId: number | null = null; // id em deleção
  let confirmOpen = false; // modal aberto?
  let confirmTargetId: number | null = null; // id alvo do modal
  let filtro = '';

  // Abre modal de confirmação
  function openConfirm(id: number) {
    confirmTargetId = id;
    confirmOpen = true;
  }
  // Fecha modal
  function closeConfirm() {
    confirmOpen = false;
    confirmTargetId = null;
  }

  // Confirma remoção
  function handleConfirm() {
    if (confirmTargetId !== null) {
      handleDelete(confirmTargetId);
    }
    closeConfirm();
  }

  // Cancela remoção
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
        error = body.message;
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

  async function buscarUsuarios()
  {
    if(filtro !== '')
    {
      try {
        const res = await api.get(`/users/nome/${encodeURIComponent(filtro)}`);""
        users = res.data.data ?? [];
      } catch (e: any) {
        console.error('Erro ao buscar usuários:', e);
      }
    }
    else
    {
        const res = await api.get('/users');
        users = res.data.data ?? [];
    }
  }
</script>

{#if loading}
  <div class="my-8 text-center text-neutral-400 font-medium uppercase tracking-widest animate-pulse">Carregando usuários...</div>
{:else if error}
  <div class="my-8 text-center text-red-500 font-semibold text-sm tracking-wide">{error}</div>
{:else}
  <div class="max-w-5xl mx-auto px-4 mt-8 mb-4">
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

  <div class="hidden xl:block px-4">
    <Table class="w-full max-w-5xl mx-auto my-8 shadow-2xl border-primary-350 bg-primary-350/80 backdrop-blur-lg rounded-none border border-separate overflow-hidden">
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
          <div class="px-4 pb-4 pt-3 flex flex-col gap-2 text-left bg-transparent">
            <div class="flex items-center gap-2.5 text-left">
              <svg class="w-4 h-4 text-primary-700 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16 12A4 4 0 1 0 8 12a4 4 0 0 0 8 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 14v7m-7-7v7m14-7v7"/></svg>
              <span class="text-primary-900 text-sm tracking-wide truncate">{user.email}</span>
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