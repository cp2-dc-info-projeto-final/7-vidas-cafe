<script lang="ts">
  // Tabela de usuários
  import { Table, TableHead, TableHeadCell, TableBody, TableBodyRow, TableBodyCell, Card, Badge } from 'flowbite-svelte'; 
  import { UserEditOutline, TrashBinOutline } from 'flowbite-svelte-icons'; 
  import { goto } from '$app/navigation'; 
  import api from '$lib/api'; 
  import type { ApiResponse } from '$lib/api';
  import { onMount } from 'svelte'; 
  import type { User } from '$lib/models/User';
  import { fade } from 'svelte/transition';

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

<main class="pt-36 pb-20 px-4 sm:px-6 lg:px-8 relative z-30 flex flex-col items-center">
  {#if loading}
      <div class="my-32 text-center text-primary-300 font-medium uppercase tracking-widest text-xs">Carregando usuários...</div>
  {:else if error}
      <div class="my-8 text-center text-red-300 bg-red-950/60 p-4 rounded-xl border border-red-900/50 text-xs tracking-wide max-w-xl mx-auto flex items-center gap-2">
          <span>⚠️</span> {error}
      </div>
  {:else}
      <div class="w-full max-w-7xl mx-auto mb-6 flex justify-start">
          <input
              type="text"
              placeholder="Pesquisar Usuário"
              class="w-full sm:w-80 bg-primary-900/90 text-primary-50 border border-primary-700/60 rounded-xl p-3 text-xs tracking-wide focus:outline-none focus:border-tertiary-500 transition-colors shadow-lg backdrop-blur-md"
              bind:value={filtro}
          />
      </div>

      <style>
          input::placeholder {
              color: #C0AA9B !important; 
              opacity: 0.6 !important; 
          }
      </style>

      <div class="hidden xl:block w-full max-w-7xl">
          <div class="w-full bg-primary-900/90 backdrop-blur-xl border border-primary-700/60 shadow-2xl rounded-2xl overflow-hidden">
              <Table class="w-full bg-transparent">
                  <TableHead class="border-b border-primary-800 bg-primary-950/40">
                      <TableHeadCell class="text-tertiary-400 w-16 bg-transparent text-[10px] font-bold uppercase tracking-[0.2em] py-4">ID</TableHeadCell>
                      <TableHeadCell class="text-tertiary-400 w-32 bg-transparent text-[10px] font-bold uppercase tracking-[0.2em] py-4">Login</TableHeadCell>
                      <TableHeadCell class="text-tertiary-400 min-w-0 bg-transparent text-[10px] font-bold uppercase tracking-[0.2em] py-4">Email</TableHeadCell>
                      <TableHeadCell class="text-tertiary-400 min-w-0 bg-transparent text-[10px] font-bold uppercase tracking-[0.2em] py-4">CPF</TableHeadCell>
                      <TableHeadCell class="text-tertiary-400 min-w-0 bg-transparent text-[10px] font-bold uppercase tracking-[0.2em] py-4">Celular</TableHeadCell>
                      <TableHeadCell class="text-tertiary-400 min-w-0 bg-transparent text-[10px] font-bold uppercase tracking-[0.2em] py-4">Nascimento</TableHeadCell>
                      <TableHeadCell class="text-tertiary-400 w-20 bg-transparent text-[10px] font-bold uppercase tracking-[0.2em] py-4">Role</TableHeadCell>
                      <TableHeadCell class="w-24 bg-transparent py-4"></TableHeadCell> 
                  </TableHead>
                  <TableBody>
                      {#each users as user}
                          <TableBodyRow class="bg-primary-950/20 hover:bg-primary-950/50 transition-colors border-b border-primary-800/80 last:border-b-0">
                              <TableBodyCell class="text-primary-300 text-xs font-medium py-4">{user.id}</TableBodyCell>
                              
                              <!-- LOGIN CLICÁVEL (DESKTOP) -->
                              <TableBodyCell class="py-4">
                                  <button 
                                      type="button"
                                      on:click={() => goto(`/pedido/pedidos-do-usuario/${user.id}`)}
                                      class="text-tertiary-400 hover:text-tertiary-300 font-semibold text-xs underline cursor-pointer text-left transition-colors"
                                      title="Ver pedidos deste usuário"
                                  >
                                      {user.login}
                                  </button>
                              </TableBodyCell>

                              <TableBodyCell class="truncate max-w-64 text-primary-200 text-xs py-4">{user.email}</TableBodyCell>
                              <TableBodyCell class="text-primary-200 text-xs py-4">{user.cpf}</TableBodyCell>
                              <TableBodyCell class="text-primary-200 text-xs py-4">{user.num_tel || 'Não informado'}</TableBodyCell>
                              <TableBodyCell class="text-primary-200 text-xs py-4">{new Date(user.dat_nas).toLocaleDateString('pt-BR')}</TableBodyCell>
                              <TableBodyCell class="py-4">
                                  <Badge class="bg-primary-950 text-tertiary-300 border border-primary-700 rounded-lg text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 shadow-inner">
                                      {user.role}
                                  </Badge>
                              </TableBodyCell>
                              <TableBodyCell class="py-4">
                                  <div class="flex items-center justify-end gap-2">
                                      <button
                                          class="p-2 rounded-lg bg-primary-900 hover:bg-primary-800 border border-primary-700 text-tertiary-300 hover:text-tertiary-200 transition-all shadow-sm cursor-pointer"
                                          title="Editar"
                                          on:click={() => goto(`/users/edit/${user.id}`)}>
                                          <UserEditOutline class="w-4 h-4" />
                                      </button>
                                      <button
                                          title="Remover"
                                          class="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-900/60 text-red-300 transition-all shadow-sm cursor-pointer"
                                          on:click={() => openConfirm(user.id)}
                                          disabled={deletingId === user.id || loading}
                                      >
                                          <TrashBinOutline class="w-4 h-4" />
                                      </button>
                                  </div>
                              </TableBodyCell>
                          </TableBodyRow>
                      {/each}
                  </TableBody>
              </Table>
          </div>
      </div>

      <div class="block xl:hidden w-full max-w-3xl">
          <div class="flex flex-col gap-4">
              {#each users as user}
              
                  <div class="bg-primary-900/90 backdrop-blur-xl border border-primary-700/60 shadow-xl rounded-2xl p-5 flex flex-col gap-4">
                      <div class="flex items-start justify-between border-b border-primary-800 pb-3 gap-3">
                          <div>
                              <!-- LOGIN CLICÁVEL (MOBILE) -->
                              <button 
                                  type="button"
                                
                                  on:click={() => goto(`/pedido/pedidos-do-usuario/${user.id}`)}
                                  class="text-sm font-black text-tertiary-400 hover:text-tertiary-300 underline tracking-wide text-left cursor-pointer transition-colors"
                              >
                                  {user.login}
                              </button>
                              
                              <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-400 mt-0.5">ID: {user.id}</div>
                              <Badge class="bg-primary-950 text-tertiary-300 border border-primary-700 rounded-lg text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 shadow-inner mt-2 inline-block">
                                  {user.role}
                              </Badge>
                          </div>
                          <div class="flex gap-2 shrink-0">
                              <button
                                  class="p-2 rounded-lg bg-primary-900 hover:bg-primary-800 border border-primary-700 text-tertiary-300 transition-all shadow-sm cursor-pointer"
                                  title="Editar"
                                  on:click={() => goto(`/users/edit/${user.id}`)}
                              >
                                  <UserEditOutline class="w-4 h-4" />
                              </button>
                              <button
                                  title="Remover"
                                  class="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-900/60 text-red-300 transition-all shadow-sm cursor-pointer"
                                  on:click={() => openConfirm(user.id)}
                                  disabled={deletingId === user.id || loading}
                              >
                                  <TrashBinOutline class="w-4 h-4" />
                              </button>
                              
                          </div>
                      </div>

                      <div class="flex flex-col gap-2.5 text-xs text-primary-200">
                          <div class="flex items-center gap-2">
                              <span class="font-bold uppercase tracking-wider text-[10px] text-tertiary-400 w-20 shrink-0">Email:</span>
                              <span class="truncate">{user.email}</span>
                          </div>
                          <div class="flex items-center gap-2">
                              <span class="font-bold uppercase tracking-wider text-[10px] text-tertiary-400 w-20 shrink-0">CPF:</span>
                              <span>{user.cpf}</span>
                          </div>
                          <div class="flex items-center gap-2">
                              <span class="font-bold uppercase tracking-wider text-[10px] text-tertiary-400 w-20 shrink-0">Celular:</span>
                              <span>{user.num_tel || 'Não informado'}</span>
                          </div>
                          <div class="flex items-center gap-2">
                              <span class="font-bold uppercase tracking-wider text-[10px] text-tertiary-400 w-20 shrink-0">Nascimento:</span>
                              <span>{new Date(user.dat_nas).toLocaleDateString('pt-BR')}</span>
                          </div>
                      </div>
                  </div>
              {/each}
          </div>
      </div>
  {/if}
</main>

<!-- Modal de Confirmação Customizado (Substitui o ConfirmModal externo) -->
{#if confirmOpen}
  <div transition:fade class="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-primary-900 border border-primary-700 rounded-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4 shadow-2xl text-center">
          <div class="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-3xl mb-1">
              ❓
          </div>
          <h3 class="font-serif font-bold text-red-400 text-xl uppercase tracking-wider">
              Confirmação
          </h3>
          <p class="text-xs text-primary-200 leading-relaxed">
              Tem certeza que deseja remover este usuário?
          </p>
          <div class="grid grid-cols-2 gap-3 w-full mt-2">
              <button 
                  type="button" 
                  on:click={handleCancel}
                  class="py-3 bg-primary-950 hover:bg-primary-800 text-tertiary-300 border border-primary-800 font-bold rounded-xl uppercase tracking-widest transition-all cursor-pointer text-xs"
              >
                  Cancelar
              </button>
              <button 
                  type="button" 
                  on:click={handleConfirm}
                  class="py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl uppercase tracking-widest transition-all shadow-md cursor-pointer text-xs"
              >
                  Remover
              </button>
          </div>
      </div>
  </div>
{/if}