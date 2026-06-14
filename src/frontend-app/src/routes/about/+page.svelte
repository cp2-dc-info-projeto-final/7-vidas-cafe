<script lang="ts">
  import { Heading, P } from "flowbite-svelte";
  import Menu from '../../components/Menu.svelte';

  // Array com os dados dos fundadores para o código ficar limpo e fácil de editar
  const fundadores = [
    { nome: "Moidixmoitie", foto: "images/cule.jpeg" },
    { nome: "Brznada", foto: "images/cucio.png" },
    { nome: "Sora", foto: "images/cututu.jpeg" },
    { nome: "Nickmaqueavelico", foto: "images/cunick.jpeg" }
  ];
</script>

<Menu />

<main class="max-w-5xl mx-auto px-6 md:px-12 pt-32 md:pt-40 pb-16 text-neutral-100">
  
  <section class="text-center mb-20">
    <span class="text-xs font-bold tracking-[0.5em] text-amber-500 uppercase block mb-3">Nossa Essência</span>
    <Heading tag="h1" class="text-4xl md:text-6xl font-black tracking-[0.2em] text-white uppercase font-serif">
      Sobre Nós
    </Heading>
    <div class="w-20 h-[2px] bg-amber-700 mx-auto mt-6"></div>
  </section>

  <section class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-28">
    <div class="space-y-6">
      <Heading tag="h2" class="text-xl md:text-2xl font-bold tracking-[0.15em] text-tertiary-700 uppercase font-serif">
        Quatro Vidas, Uma Paixão
      </Heading>
      <P class="text-base leading-relaxed text-secondary-100 text-justify tracking-wide font-light">
        Nossa cafeteria nasceu da união de quatro amigos que compartilhavam o mesmo sonho e duas grandes paixões: Cafés excepcionais e felinos!!. Decidimos criar mais do que um balcão de atendimento; moldamos um refúgio acolhedor e sofisticado onde esses dois mundos se encontram em perfeita harmonia.
      </P>
      <P class="text-base leading-relaxed text-secondary-100 text-justify tracking-wide font-light">
        No <span class="text-amber-500 font-medium">7 Vidas Café</span>, cada detalhe é pensado para o seu bem-estar e o dos nossos moradores. Aqui, você pode saborear bebidas artesanais e sobremesas premium enquanto desfruta da companhia terapêutica de nossos gatinhos.
      </P>
    </div>

    <div class="relative group justify-self-center md:justify-self-end">
      <div class="absolute -inset-1 bg-amber-600/20 blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
      <img 
        src="images/gatinhoslindosfofos.png" 
        alt="Gatinho residente do 7 Vidas Café" 
        class="w-full h-[300px] object-cover grayscale contrast-125 opacity-70 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700"
      />
    </div>
  </section>

  <section class="mb-28">
    <div class="text-center mb-16">
      <span class="text-xs font-bold tracking-[0.4em] text-amber-500 uppercase block mb-2">As Mentes Por Trás</span>
      <Heading tag="h2" class="text-2xl md:text-3xl font-black tracking-[0.15em] text-white uppercase font-serif">
        Quem Somos
      </Heading>
      <div class="w-12 h-[1px] bg-neutral-700 mx-auto mt-4"></div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {#each fundadores as integrante}
        <div class="border border-neutral-900 bg-neutral-950/40 p-5 flex flex-col items-center text-center group transition-all duration-300 hover:border-amber-600/40">
          
          <div class="w-full aspect-square mb-4 overflow-hidden bg-neutral-900 border border-neutral-800">
            <img 
              src={integrante.foto} 
              alt={integrante.nome} 
              class="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" 
            />
          </div>

          <span class="text-xs font-bold tracking-widest text-amber-500 uppercase mb-1">{integrante.cargo}</span>
          <h3 class="text-base font-bold tracking-wide text-white uppercase mb-3">{integrante.nome}</h3>
          <p class="text-xs text-neutral-400 leading-relaxed font-light tracking-wide">
            {integrante.bio}
          </p>
        </div>
      {/each}
    </div>
  </section>

  <section class="border border-neutral-900 bg-tertiary-900 backdrop-blur-sm p-8 md:p-12 text-center relative overflow-hidden">
    <div class="absolute top-0 right-0 p-4 text-neutral-900/40 select-none text-7xl font-serif">🐾</div>
    
    <Heading tag="h3" class="text-lg font-bold tracking-[0.25em] text-secondary-200 uppercase mb-4">
      Mais que um Café, um Lar Temporário
    </Heading>
    
    <p class="max-w-2xl mx-auto text-sm md:text-base leading-relaxed text-tertiary-200 tracking-wide font-light">
      Todos os felinos em nossa loja física estão prontos para receber amor e, quem sabe, encontrar uma nova família. Se você sentir uma conexão especial com algum de nossos companheiros de quatro patas durante a sua visita, saiba que <strong class="text-amber-500 font-semibold">nosso projeto apoia e facilita a adoção responsável</strong>. Venha nos visitar, tome um bom espresso e mude uma vida.
    </p>
  </section>

</main>