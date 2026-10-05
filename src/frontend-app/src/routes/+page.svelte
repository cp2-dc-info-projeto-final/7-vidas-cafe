<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import Menu from '../components/Menu.svelte';
  import api from '$lib/api';
  import { TagOutline, ArrowRightOutline, ChevronLeftOutline, ChevronRightOutline } from 'flowbite-svelte-icons';

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
    if (!item.promocao || item.promocao <= 0) return false;
    const agora = new Date().getTime();
    const inicio = item.iniciopromocao ? new Date(item.iniciopromocao).getTime() : null;
    const fim = item.fimpromocao ? new Date(item.fimpromocao).getTime() : null;

    const inicioValid = !inicio || agora >= inicio;
    const fimValid = !fim || agora <= fim;
    return inicioValid && fimValid;
  }

  function calcularPrecoFinal(item: MenuItem): number {
    if (isPromocaoAtiva(item) && item.promocao) {
      return Number(item.preco) * (1 - item.promocao / 100);
    }
    return Number(item.preco);
  }

  function formatarPreco(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor));
  }

  async function carregarPromocoes() {
    loadingPromos = true;
    try {
      const res = await api.get('/Cardapio');
      let dados: MenuItem[] = res.data.data ?? res.data ?? [];
      promoItems = dados
        .filter((item) => isPromocaoAtiva(item))
        .slice(0, MAX_PROMO_ITEMS);
    } catch (e) {
      console.error('Erro ao carregar promoções na Home:', e);
    } finally {
      loadingPromos = false;
    }
  }

  // --- Permitir scroll com a roda do mouse horizontalmente (sem Shift) ---
  function handleWheel(e: WheelEvent) {
    if (promoCarouselRef) {
      // Se o usuário mexer a roda do mouse vertical ou horizontalmente, movemos na horizontal
      const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      promoCarouselRef.scrollLeft += delta;
      e.preventDefault(); // Impede a página de subir/descer
    }
  }

  // --- Carrossel de Ofertas em Loop Infinito Contínuo ---
  function iniciarGiroPromocoes() {
    detorgaGiroPromocoes();
    promoInterval = setInterval(() => {
      if (promoCarouselRef && !isDown) {
        const itemWidth = 240; // Largura do card + gap
        promoCarouselRef.scrollBy({ left: itemWidth, behavior: 'smooth' });

        // Se chegou na metade (onde os itens duplicados começam), 
        // ele teleporta instantaneamente para o início sem o usuário perceber.
        setTimeout(() => {
          if (promoCarouselRef) {
            const metadeLargura = promoCarouselRef.scrollWidth / 2;
            if (promoCarouselRef.scrollLeft >= metadeLargura) {
              promoCarouselRef.scrollTo({ left: 0, behavior: 'auto' });
            }
          }
        }, 400); // tempo para esperar terminar o scroll smooth
      }
    }, 3500);
  }

  function detorgaGiroPromocoes() {
    if (promoInterval) clearInterval(promoInterval);
  }
  // --- Funções de Arrastar com o Mouse (Drag to Scroll) ---
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
    const walk = (x - startX) * 2; // Velocidade do arraste
    promoCarouselRef.scrollLeft = scrollLeft - walk;
  }

  function iniciarGiroCategorias() {
    detorgaGiroCategorias();
    categoryInterval = setInterval(() => {
      proximaCategoria();
    }, 4500);
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
    // Certifique-se de que a página /Cardapio lê os parâmetros da URL (ex: usando page.url.searchParams.get('categoria'))
    window.location.href = `/Cardapio?categoria=${encodeURIComponent(catName)}`;
  }

  onMount(async () => {
    await carregarPromocoes();
    iniciarGiroPromocoes();
    iniciarGiroCategorias();
  });

  onDestroy(() => {
    detorgaGiroPromocoes();
    detorgaGiroCategorias();
  });
</script>

<Menu />

<main class="mx-auto pt-32 md:pt-40 pb-16 px-4 max-w-7xl text-primary-50">
  
  <header class="text-center mb-10 md:mb-14">
    <h1 class="text-4xl md:text-6xl font-black uppercase tracking-wider text-tertiary-300 font-serif drop-shadow-md">
      Bem-vindos ao 7 Vidas Café
    </h1>
    <p class="text-sm md:text-base text-primary-200 mt-3 font-medium max-w-2xl mx-auto">
      O cantinho mais aconchegante para saborear cafés especiais, doces irresistíveis e momentos inesquecíveis!
    </p>
  </header>

  <!-- Promoções -->
  <section class="mb-14 bg-primary-900/80 border-2 border-tertiary-600/60 rounded-3xl p-4 md:p-6 shadow-2xl backdrop-blur-sm">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-primary-700/80">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🔥</span>
        <h2 class="text-xl md:text-2xl font-black uppercase tracking-wider text-tertiary-300 font-serif">
          Ofertas Imperdíveis
        </h2>
      </div>

      <a
        href="/promocoes"
        class="inline-flex items-center gap-2 bg-tertiary-500 hover:bg-tertiary-400 text-primary-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 border border-tertiary-300 shadow-md self-start sm:self-auto hover:scale-105"
      >
        <span>Ver Todas as Promoções</span>
        <ArrowRightOutline class="w-4 h-4" />
      </a>
    </div>

    {#if loadingPromos}
      <div class="py-12 text-center text-primary-300 font-bold uppercase tracking-widest animate-pulse text-xs">
        Buscando deliciosas promoções...
      </div>
    {:else if promoItems.length === 0}
      <div class="py-8 text-center text-primary-300 text-xs uppercase font-medium tracking-wider">
        Nenhuma promoção ativa no momento. Fique de olho em breve!
      </div>
    {:else}
      <!-- Carrossel com suporte a Mouse Drag e Scroll -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
      bind:this={promoCarouselRef}
      on:mouseenter={detorgaGiroPromocoes}
      on:mouseleave={handleMouseLeave}
      on:mousedown={handleMouseDown}
      on:mouseup={handleMouseUp}
      on:mousemove={handleMouseMove}
      on:wheel={handleWheel}
      class="flex gap-4 overflow-x-auto scrollbar-none scroll-smooth py-2 px-1 no-scrollbar cursor-grab active:cursor-grabbing select-none"
    >
      <!-- Itens duplicados -->
      {#each [...promoItems, ...promoItems] as item, index}
          <div
            on:click={() => window.location.href = `/Cardapio/${item.id}`}
            class="min-w-[220px] max-w-[220px] bg-primary-800 border-2 border-tertiary-600/70 hover:border-tertiary-400 rounded-2xl overflow-hidden shadow-lg cursor-pointer transition-all duration-300 hover:scale-105 flex flex-col justify-between shrink-0 group relative"
          >
            <!-- Imagem e Tag -->
            <div class="relative h-32 bg-primary-950 overflow-hidden flex items-center justify-center pointer-events-none">
              {#if item.imagem}
                <img src={item.imagem} alt={item.nome} class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              {:else}
                <span class="text-[10px] text-tertiary-300 uppercase font-bold">Sem imagem</span>
              {/if}

              <div class="absolute top-2 right-2 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-red-400 shadow-md animate-pulse">
                -{item.promocao}%
              </div>
            </div>

            <!-- Dados do Item -->
            <div class="p-3 flex-1 flex flex-col justify-between">
              <div>
                <h3 class="font-black text-sm text-primary-50 line-clamp-1 group-hover:text-tertiary-300 transition-colors">
                  {item.nome}
                </h3>
                <p class="text-[11px] text-primary-200 line-clamp-2 mt-1 leading-snug">
                  {item.resumo}
                </p>
              </div>

              <!-- Preço -->
              <div class="mt-3 pt-2 border-t border-primary-700/80 flex items-center justify-between">
                <span class="text-[10px] text-gray-400 line-through">
                  {formatarPreco(item.preco)}
                </span>
                <span class="text-sm font-black text-primary-950 bg-tertiary-400 px-2.5 py-0.5 rounded-lg border border-tertiary-300">
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
  <section class="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
    
    <div class="relative bg-gradient-to-br from-primary-800 to-primary-900 border-2 border-tertiary-600/80 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-between min-h-[320px] md:min-h-[380px] group overflow-hidden">
      <div 
        class="absolute inset-0 bg-cover bg-center opacity-25 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
        style="background-image: url('https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1000&auto=format&fit=crop');"
      ></div>
      <div class="absolute inset-0 bg-gradient-to-t from-primary-950 via-primary-900/60 to-transparent pointer-events-none"></div>

      <div class="relative z-10">
        <span class="inline-block bg-tertiary-600 text-primary-50 text-[10px] md:text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-tertiary-400 mb-3 shadow-md">
          Cardápio Completo
        </span>
        <h2 class="text-3xl md:text-4xl font-black text-primary-50 uppercase tracking-wider font-serif group-hover:text-tertiary-300 transition-colors">
          Explore Nossas Delícias
        </h2>
        <p class="text-xs md:text-sm text-primary-200 mt-2 max-w-md leading-relaxed">
          Conheça todas as opções de bebidas salgadas, quentes, doces e artesanais preparadas especialmente para o seu dia.
        </p>
      </div>

      <div class="relative z-10 pt-6">
        <a
          href="/Cardapio"
          class="inline-flex items-center gap-3 bg-tertiary-500 hover:bg-tertiary-400 text-primary-950 font-black px-6 py-3 rounded-2xl text-xs md:text-sm uppercase tracking-wider transition-all duration-300 border border-tertiary-300 shadow-xl hover:scale-105"
        >
          <span>Ver Cardápio Completo</span>
          <ArrowRightOutline class="w-5 h-5" />
        </a>
      </div>
    </div>

    <div 
      class="relative bg-primary-900 border-2 border-tertiary-600/80 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col justify-between min-h-[320px] md:min-h-[380px] overflow-hidden group"
      on:mouseenter={detorgaGiroCategorias}
      on:mouseleave={iniciarGiroCategorias}
    >
      {#each categoriasBanners as cat, index}
        {#if index === currentCatIndex}
          <div 
            class="absolute inset-0 bg-cover bg-center transition-all duration-700 group-hover:scale-105 pointer-events-none"
            style={`background-image: url('${cat.imagem}');`}
          ></div>
          <div class="absolute inset-0 bg-gradient-to-t from-primary-950 via-primary-950/80 to-primary-900/40 pointer-events-none"></div>

          <div class="relative z-10">
            <span class={`inline-block ${cat.corTag} text-white text-[10px] md:text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-white/20 mb-3 shadow-md`}>
              Categoria em Destaque
            </span>
            <h2 class="text-3xl md:text-4xl font-black text-primary-50 uppercase tracking-wider font-serif">
              {cat.titulo}
            </h2>
            <p class="text-xs md:text-sm text-primary-200 mt-2 max-w-md leading-relaxed">
              {cat.descricao}
            </p>
          </div>

          <div class="relative z-10 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <button
              type="button"
              on:click={() => irParaCardapioCategoria(cat.id)}
              class="inline-flex items-center gap-3 bg-tertiary-500 hover:bg-tertiary-400 text-primary-950 font-black px-6 py-3 rounded-2xl text-xs md:text-sm uppercase tracking-wider transition-all duration-300 border border-tertiary-300 shadow-xl hover:scale-105 cursor-pointer self-start"
            >
              <span>Ver {cat.id}</span>
              <ArrowRightOutline class="w-5 h-5" />
            </button>

            <div class="flex items-center gap-2 self-center sm:self-auto bg-primary-950/70 px-3 py-1.5 rounded-full border border-tertiary-600/50 backdrop-blur-md">
              {#each categoriasBanners as _, bIndex}
                <button
                  type="button"
                  aria-label={`Ir para categoria ${categoriasBanners[bIndex].id}`}
                  on:click={() => selecionarCategoriaIndex(bIndex)}
                  class={`h-3 rounded-full transition-all duration-300 cursor-pointer ${
                    bIndex === currentCatIndex 
                      ? 'w-8 bg-tertiary-400 border border-tertiary-200' 
                      : 'w-3 bg-primary-600 hover:bg-tertiary-500/60'
                  }`}
                ></button>
              {/each}
            </div>
          </div>
        {/if}
      {/each}
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