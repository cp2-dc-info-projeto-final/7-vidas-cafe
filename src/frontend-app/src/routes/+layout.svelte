<script lang="ts">
  import '../app.css';
  import Menu from '../components/Menu.svelte';
  let { children } = $props();
</script>

<main 
  class="min-h-screen w-full bg-neutral-700 bg-cover bg-center bg-no-repeat bg-fixed bg-blend-multiply text-[#f5f2eb] antialiased flex flex-col"
  style="background-image: url('/images/cafeslayout.jpg');"
>
  
  <div class="h-[1px] w-full bg-neutral-900/40 fixed top-0 left-0 z-[60]"></div>

  <Menu />
  
  <div class="w-full max-w-5xl mx-auto px-6 md:px-12 flex-grow pb-24">
    {@render children()}
  </div>

  <footer class="w-full border-t border-neutral-900/30 py-8 text-center text-[11px] tracking-[0.3em] text-neutral-500 uppercase font-mono bg-[#0a0908]/80 backdrop-blur-sm">
    © 7 Vidas Café // Todos os direitos reservados.
  </footer>
</main>