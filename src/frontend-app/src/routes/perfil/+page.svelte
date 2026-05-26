<script lang="ts">
    import { Heading, card, Navbar, NavBrand, NavLi, NavUl, NavHamburger } from 'flowbite-svelte';
    import Menu from '../../components/Menu.svelte';
    import {  P, ImagePlaceholder, Skeleton, TextPlaceholder } from "flowbite-svelte";
    import { goto } from "$app/navigation";
    import { logout, getCurrentUser, getToken, type User, login } from "$lib/auth";


    let user: User | null = null;
    let hasToken = false;
    let loadingUser = false;
    let authRequestId = 0;


    async function updateAuthStatus() {
    hasToken = getToken() !== null;

    if (!hasToken) {
      user = null;
      loadingUser = false;
      return;
    }

    if (user || loadingUser) {
      return;
    }

    loadingUser = true;
    const requestId = ++authRequestId;

    try {
      const userData = await getCurrentUser();
      if (requestId !== authRequestId) {
        return;
      }
      user = userData;
      hasToken = userData !== null;
    } catch {
      if (requestId !== authRequestId) {
        return;
      }
      user = null;
      hasToken = false;
    } finally {
      if (requestId === authRequestId) {
        loadingUser = false;
      }
    }
  }
  </script>
  
  
  <Menu />
  <card>
    <div class="text-center p-8 pt-32">
        <Heading tag="h2" class="text-4xl font-extrabold tracking-tight  text-secondary-600 : dark:text-white mb-6">Perfil</Heading>
        <P class="text-lg leading-relaxed text-secondary-900 dark:text-gray-300 mb-4 text-justify">
        oi
        </P>
          <div>
          <button
          class="p-2 rounded border border-primary-500 hover:border-tertiary-50 transition bg-transparent"
          title="Editar"
          on:click={() => goto(`/users/edit/${user.id}`)}>
          oi
        </button>
        </div>
    
    </div>
  </card>