<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Menu from '../components/Menu.svelte';
  import api from '$lib/api';
  import { TagOutline, ArrowRightOutline, ChevronLeftOutline, ChevronRightOutline, MusicOutline, HeartOutline } from 'flowbite-svelte-icons';

  interface MenuItem {
    id: number;
    nome: string;
    preco: number;
    categoria: string;
    resumo: string;
    promocao?: number | null;
    iniciopromocao?: string | null;
    fimpromocao?: string | null;
    imagem?: string | null;
  }

  interface CategoriaBanner {
    id: string;
    titulo: string;
    descricao: string;
    imagem: string;
    corTag: string;
  }

  let promoItems: MenuItem[] = [];
  let loadingPromos = true;
  const MAX_PROMO_ITEMS = 8;

  // Carrossel de promoções
  let promoCarouselRef: HTMLDivElement;
  let promoInterval: any;

  // Controle de arrastar com o mouse (Drag to scroll)
  let isDown = false;
  let startX: number;
  let scrollLeft: number;

  const categoriasBanners: CategoriaBanner[] = [
    {
      id: 'Bebidas',
      titulo: 'Bebidas Especiais',
      descricao: 'Cafés cremosos, sucos e sodas artesanais feitos com carinho.',
      imagem: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=800&auto=format&fit=crop',
      corTag: 'bg-amber-700'
    },
    {
      id: 'Doces',
      titulo: 'Doces & Sobremesas',
      descricao: 'Bolos, tortas e delícias doces inspiradas no nosso amor por fofuras.',
      imagem: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=800&auto=format&fit=crop',
      corTag: 'bg-pink-700'
    },
    {
      id: 'Salgados',
      titulo: 'Salgados & Lanches',
      descricao: 'Quiches, croissants e sanduíches fresquinhos a qualquer hora.',
      imagem: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=800&auto=format&fit=crop',
      corTag: 'bg-amber-800'
    }
  ];

  let currentCatIndex = 0;
  let categoryInterval: any;

  function isPromocaoAtiva(item: MenuItem): boolean {
    const valorPromo = Number(item.promocao);
    return !isNaN(valorPromo) && valorPromo > 0;
  }

  function calcularPrecoFinal(item: MenuItem): number {
    if (isPromocaoAtiva(item) && item.promocao) {
      return Number(item.preco) * (1 - Number(item.promocao) / 100);
    }
    return Number(item.preco);
  }

  function formatarPreco(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor));
  }

  async function carregarPromocoes() {
    loadingPromos = true;
    try {
      const res = await api.get('/cardapio');
      let dados: MenuItem[] = res.data.data ?? res.data ?? [];

      promoItems = dados
        .filter((item) => {
          const valorPromo = Number(item.promocao);
          return !isNaN(valorPromo) && valorPromo > 0;
        })
        .slice(0, MAX_PROMO_ITEMS);
    } catch (e) {
      console.error('Erro ao carregar promoções na Home:', e);
    } finally {
      loadingPromos = false;
    }
  }

  function handleWheel(e: WheelEvent) {
    if (promoCarouselRef) {
      const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      promoCarouselRef.scrollLeft += delta;
      e.preventDefault();
    }
  }

  function iniciarGiroPromocoes() {
    detorgaGiroPromocoes();
    promoInterval = setInterval(() => {
      if (promoCarouselRef && !isDown) {
        promoCarouselRef.scrollLeft += 1;
        const metadeLargura = promoCarouselRef.scrollWidth / 2;
        if (promoCarouselRef.scrollLeft >= metadeLargura) {
          promoCarouselRef.scrollLeft -= metadeLargura;
        }
      }
    }, 35);
  }

  function detorgaGiroPromocoes() {
    if (promoInterval) {
      clearInterval(promoInterval);
      promoInterval = null;
    }
  }

  function handleMouseDown(e: MouseEvent) {
    isDown = true;
    detorgaGiroPromocoes();
    startX = e.pageX - promoCarouselRef.offsetLeft;
    scrollLeft = promoCarouselRef.scrollLeft;
  }

  function handleMouseLeave() {
    if (isDown) {
      isDown = false;
      iniciarGiroPromocoes();
    }
  }

  function handleMouseUp() {
    if (isDown) {
      isDown = false;
      iniciarGiroPromocoes();
    }
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - promoCarouselRef.offsetLeft;
    const walk = (x - startX) * 2;
    promoCarouselRef.scrollLeft = scrollLeft - walk;
  }

  function iniciarGiroCategorias() {
    detorgaGiroCategorias();
    categoryInterval = setInterval(() => {
      proximaCategoria();
    }, 5000);
  }

  function detorgaGiroCategorias() {
    if (categoryInterval) clearInterval(categoryInterval);
  }

  function proximaCategoria() {
    currentCatIndex = (currentCatIndex + 1) % categoriasBanners.length;
  }

  function selecionarCategoriaIndex(idx: number) {
    currentCatIndex = idx;
    iniciarGiroCategorias();
  }

  function irParaCardapioCategoria(catName: string) {
    window.location.href = `/Cardapio?categoria=${encodeURIComponent(catName)}`;
  }

  onMount(async () => {
    await carregarPromocoes();
    setTimeout(() => {
      iniciarGiroPromocoes();
    }, 100);
    iniciarGiroCategorias();
  });

  onDestroy(() => {
    detorgaGiroPromocoes();
    detorgaGiroCategorias();
  });
</script>

<Menu />

<!-- Brilho ambiente decorativo de fundo -->
<div class="fixed top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-tertiary-500/10 rounded-full blur-[120px] pointer-events-none z-10"></div>

<main class="mx-auto pt-40 md:pt-53 pb-20 px-4 max-w-7xl text-primary-50 relative z-20">
  
  <header class="text-center mb-12 md:mb-16">
    <div class="inline-flex items-center gap-2 text-tertiary-300 font-bold uppercase tracking-[0.3em] text-[11px] mb-4 bg-primary-900/80 px-5 py-2 rounded-full border border-tertiary-500/30 shadow-lg shadow-black/20 backdrop-blur-md">
      <span>✨</span> Café & Atmosfera <span>✨</span>
    </div>
    <h1 class="text-4xl md:text-6xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-tertiary-200 via-tertiary-300 to-tertiary-400 font-serif drop-shadow-sm">
      Bem-vindos ao 7 Vidas Café
    </h1>
    <p class="text-sm md:text-base text-primary-200 mt-4 font-medium max-w-2xl mx-auto leading-relaxed">
      O cantinho mais aconchegante para saborear cafés especiais, doces irresistíveis e momentos inesquecíveis!
    </p>
  </header>

  <!-- Promoções -->
  <section class="mb-16 bg-primary-900/60 border border-tertiary-500/30 rounded-[2.5rem] p-5 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl relative overflow-hidden">
    <div class="absolute -right-20 -top-20 w-64 h-64 bg-tertiary-600/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-primary-700/60">
      <div class="flex items-center gap-3">
        <div>
          <h2 class="text-xl md:text-2xl font-black uppercase tracking-wider text-tertiary-300 font-serif">
            Ofertas Imperdíveis
          </h2>
          <p class="text-[11px] text-primary-300 tracking-wide uppercase font-medium">Delícias selecionadas com descontos especiais</p>
        </div>
      </div>

      <a
        href="/promocoes"
        class="inline-flex items-center gap-2 bg-tertiary-500 hover:bg-tertiary-400 text-primary-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-300 border border-tertiary-300 shadow-lg shadow-tertiary-500/20 self-start sm:self-auto hover:scale-105 active:scale-95"
      >
        <span>Ver Todas as Promoções</span>
        <ArrowRightOutline class="w-4 h-4" />
      </a>
    </div>

    {#if loadingPromos}
      <div class="py-16 text-center text-tertiary-300 font-bold uppercase tracking-widest animate-pulse text-xs">
        Buscando deliciosas promoções...
      </div>
    {:else if promoItems.length === 0}
      <div class="py-10 text-center text-primary-300 text-xs uppercase font-medium tracking-wider">
        Nenhuma promoção ativa no momento. Fique de olho em breve!
      </div>
    {:else}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
      bind:this={promoCarouselRef}
      on:mouseenter={detorgaGiroPromocoes}
      on:mouseleave={iniciarGiroPromocoes}
      on:mousedown={handleMouseDown}
      on:mouseup={handleMouseUp}
      on:mousemove={handleMouseMove}
      on:wheel={handleWheel}
      class="flex gap-5 overflow-x-auto scrollbar-none scroll-smooth py-3 px-1.5 no-scrollbar cursor-grab active:cursor-grabbing select-none"
    >
      {#each [...promoItems, ...promoItems] as item, index}
          <div
            on:click={() => window.location.href = `/Cardapio/${item.id}`}
            class="min-w-[220px] max-w-[220px] bg-primary-950/80 border border-tertiary-500/30 hover:border-tertiary-400 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-tertiary-500/10 cursor-pointer transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between shrink-0 group relative"
          >
            <div class="relative h-36 bg-primary-900 overflow-hidden flex items-center justify-center pointer-events-none">
              {#if item.imagem}
                <img src={item.imagem} alt={item.nome} class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
              {:else}
                <span class="text-[10px] text-tertiary-300 uppercase font-bold">Sem imagem</span>
              {/if}

              <div class="absolute inset-0 bg-gradient-to-t from-primary-950/80 via-transparent to-transparent"></div>

              <div class="absolute top-2.5 right-2.5 bg-red-600/90 backdrop-blur-md text-white font-black text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-red-400/50 shadow-lg animate-pulse">
                -{item.promocao}%
              </div>
            </div>

            <div class="p-3.5 flex-1 flex flex-col justify-between gap-3">
              <div>
                <h3 class="font-black text-sm text-primary-50 line-clamp-1 group-hover:text-tertiary-300 transition-colors">
                  {item.nome}
                </h3>
                <p class="text-[11px] text-primary-300 line-clamp-2 mt-1 leading-relaxed">
                  {item.resumo}
                </p>
              </div>

              <div class="pt-2.5 border-t border-primary-800/80 flex items-center justify-between">
                <span class="text-[10px] text-primary-400 line-through font-medium">
                  {formatarPreco(item.preco)}
                </span>
                <span class="text-xs font-black text-primary-950 bg-tertiary-400 px-2.5 py-1 rounded-lg border border-tertiary-200 shadow-md">
                  {formatarPreco(calcularPrecoFinal(item))}
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Categorias -->
  <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-16">
    
    <div class="relative bg-gradient-to-br from-primary-900 via-primary-900/90 to-primary-950 border border-tertiary-500/30 rounded-[2.5rem] p-7 md:p-9 shadow-2xl flex flex-col justify-between min-h-[340px] md:min-h-[400px] group overflow-hidden">
      <div 
        class="absolute inset-0 bg-cover bg-center opacity-20 group-hover:scale-110 transition-transform duration-1000 ease-out pointer-events-none"
        style="background-image: url('https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1000&auto=format&fit=crop');"
      ></div>
      <div class="absolute inset-0 bg-gradient-to-t from-primary-950 via-primary-950/70 to-transparent pointer-events-none"></div>

      <div class="relative z-10">
        <span class="inline-block bg-tertiary-600/90 text-primary-50 text-[10px] md:text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full border border-tertiary-400/50 mb-4 shadow-md backdrop-blur-md">
          Cardápio Completo
        </span>
        <h2 class="text-3xl md:text-4xl font-black text-primary-50 uppercase tracking-wider font-serif group-hover:text-tertiary-300 transition-colors drop-shadow-md">
          Explore Nossas Delícias
        </h2>
        <p class="text-xs md:text-sm text-primary-200 mt-3 max-w-md leading-relaxed font-medium">
          Conheça todas as opções de bebidas salgadas, quentes, doces e artesanais preparadas especialmente para o seu dia.
        </p>
      </div>

      <div class="relative z-10 pt-6">
        <a
          href="/Cardapio"
          class="inline-flex items-center gap-3 bg-tertiary-500 hover:bg-tertiary-400 text-primary-950 font-black px-7 py-3.5 rounded-2xl text-xs md:text-sm uppercase tracking-wider transition-all duration-300 border border-tertiary-200 shadow-xl shadow-tertiary-500/20 hover:scale-105 active:scale-95"
        >
          <span>Ver Cardápio Completo</span>
          <ArrowRightOutline class="w-5 h-5" />
        </a>
      </div>
    </div>

    <div 
      class="relative bg-primary-900 border border-tertiary-500/30 rounded-[2.5rem] p-7 md:p-9 shadow-2xl flex flex-col justify-between min-h-[340px] md:min-h-[400px] overflow-hidden group"
      on:mouseenter={detorgaGiroCategorias}
      on:mouseleave={iniciarGiroCategorias}
    >
      {#each categoriasBanners as cat, index}
        {#if index === currentCatIndex}
          <div 
            class="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-out group-hover:scale-110 pointer-events-none"
            style={`background-image: url('${cat.imagem}');`}
          ></div>
          <div class="absolute inset-0 bg-gradient-to-t from-primary-950 via-primary-950/80 to-primary-900/40 pointer-events-none"></div>

          <div class="relative z-10">
            <span class={`inline-block ${cat.corTag} text-white text-[10px] md:text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full border border-white/20 mb-4 shadow-md backdrop-blur-md`}>
              Categoria em Destaque
            </span>
            <h2 class="text-3xl md:text-4xl font-black text-primary-50 uppercase tracking-wider font-serif drop-shadow-md">
              {cat.titulo}
            </h2>
            <p class="text-xs md:text-sm text-primary-200 mt-3 max-w-md leading-relaxed font-medium">
              {cat.descricao}
            </p>
          </div>

          <div class="relative z-10 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              type="button"
              on:click={() => irParaCardapioCategoria(cat.id)}
              class="inline-flex items-center gap-3 bg-tertiary-500 hover:bg-tertiary-400 text-primary-950 font-black px-7 py-3.5 rounded-2xl text-xs md:text-sm uppercase tracking-wider transition-all duration-300 border border-tertiary-200 shadow-xl shadow-tertiary-500/20 hover:scale-105 active:scale-95 cursor-pointer self-start"
            >
              <span>Ver {cat.id}</span>
              <ArrowRightOutline class="w-5 h-5" />
            </button>

            <div class="flex items-center gap-2 self-center sm:self-auto bg-primary-950/80 px-3.5 py-2 rounded-full border border-tertiary-500/30 backdrop-blur-md shadow-inner">
              {#each categoriasBanners as _, bIndex}
                <button
                  type="button"
                  aria-label={`Ir para categoria ${categoriasBanners[bIndex].id}`}
                  on:click={() => selecionarCategoriaIndex(bIndex)}
                  class={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                    bIndex === currentCatIndex 
                       ? 'w-8 bg-tertiary-400 border border-tertiary-200 shadow-sm' 
                       : 'w-2.5 bg-primary-600 hover:bg-tertiary-500/60'
                  }`}
                ></button>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  </section>

  <!-- SEÇÃO SETE VIDAS PLAYLIST -->
  <section class="relative bg-primary-950 border border-tertiary-500/30 rounded-[2.5rem] p-8 md:p-14 shadow-2xl overflow-hidden">
    
    <!-- Fundo texturizado com grãos de café imersivo -->
    <div 
      class="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none mix-blend-luminosity"
      style="background-image: url('/images/cfeir.jpg');"
    ></div>
    <div class="absolute inset-0 bg-gradient-to-t from-primary-950 via-primary-950/80 to-primary-900/60 pointer-events-none"></div>

    <div class="relative z-10 flex flex-col gap-10">
      
      <!-- Cabeçalho da Seção (Título 7 Vidas Playlist centralizado no topo) -->
      <div class="text-center space-y-2">
        <span class="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-tertiary-400">
          7 Vidas Café
        </span>
        <h2 class="text-3xl md:text-5xl font-black uppercase tracking-[0.15em] text-tertiary-300 font-serif drop-shadow-md">
          Playlist
        </h2>
      </div>

      <!-- Grid de Duas Colunas -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        
        <div class="lg:col-span-1 flex flex-col justify-between gap-6">
          <div>
            <div class="inline-flex items-center gap-2 bg-primary-900/90 text-tertiary-300 text-[10px] font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full border border-tertiary-500/30 mb-4 shadow-sm backdrop-blur-md">
              <HeartOutline class="w-3.5 h-3.5 text-tertiary-400" />
              <span>Atmosfera 7 Vidas</span>
            </div>
            <h3 class="text-2xl md:text-3xl font-black uppercase tracking-wider text-tertiary-300 font-serif mb-3 drop-shadow-md">
              Sua Pausa com Estilo
            </h3>
            <p class="text-xs md:text-sm text-primary-200 leading-relaxed font-medium">
              Mais que um café, um refúgio visual e sensorial. Curta nossa curadoria musical exclusiva para acompanhar o seu momento.
            </p>
          </div>

          
          <div class="bg-primary-900/80 border border-tertiary-500/20 p-4 rounded-2xl backdrop-blur-md shadow-lg">
            <p class="text-[11px] md:text-xs text-tertiary-200 font-serif italic leading-relaxed">
              "Mas alguns poucos encontram consolo no abraço de tijolos, madeira e vidro. As histórias são contadas entre bebidas e depois passam a morar nas memórias de estranhos."
              <span class="block mt-1 text-[10px] text-tertiary-400 not-italic uppercase tracking-widest font-bold">— Coffee Talk</span>
            </p>
          </div>
        </div>

        <!-- Coluna da Direita: Player do Spotify Maior (352px) -->
        <div class="lg:col-span-2 bg-primary-900/80 border border-tertiary-500/30 rounded-3xl p-4 md:p-6 shadow-2xl backdrop-blur-xl flex items-center justify-center">
          <div class="w-full relative z-10 flex items-center justify-center">
            <iframe 
              style="border-radius:20px" 
              src="https://open.spotify.com/embed/album/5QSWmnTnWNAwOwIB0cOrLW?utm_source=generator&si=fe213dc2b0374915&theme=0" 
              width="100%" 
              height="352" 
              frameborder="0" 
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
              allowfullscreen
              loading="lazy"
              title="Playlist 7 Vidas Café"
              class="w-full shadow-lg"
            ></iframe>
          </div>
        </div>

      </div>

    </div>
  </section>

</main>

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>