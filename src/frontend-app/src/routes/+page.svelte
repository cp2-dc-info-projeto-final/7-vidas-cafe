<script lang="ts">
  import { Heading, P } from 'flowbite-svelte';
  import Menu from '../components/Menu.svelte';
</script>

<Menu />

<main class="max-w-5xl mx-auto px-6 md:px-12 pt-32 md:pt-40 pb-16 text-neutral-100">

  <section class="text-center mb-20">
    <span class="text-xs font-bold tracking-[0.5em] text-amber-500 uppercase block mb-3">Bem-vindo/a/e!</span>
    <Heading tag="h1" class="text-4xl md:text-6xl font-black tracking-[0.2em] text-white uppercase font-serif">
      Home
    </Heading>
    <div class="w-20 h-[2px] bg-amber-600 mx-auto mt-6"></div>
  </section>

  <section class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mb-24">
    
    <div class="space-y-6">
      <Heading tag="h2" class="text-xl md:text-2xl font-bold tracking-[0.15em] text-amber-500 uppercase font-serif">
        Grãos Nobres, Companhia Terapêutica
      </Heading>
      
      <P class="text-base leading-relaxed text-secondary-200 text-justify tracking-wide font-light">
        Seja bem-vindo ao <span class="text-amber-500 font-medium">7 Vidas Café</span>. Aqui, servimos cafés especiais, sobremesas artesanais e salgados de altíssima qualidade, preparados com rigor técnico e paixão.
      </P>
      
      <P class="text-base leading-relaxed text-secondary-200 text-justify tracking-wide font-light">
        Contamos com um sistema exclusivo de entregas e encomendas. Você pode optar por retirar seu pedido diretamente em nossa loja física ou solicitar que ele vá até você, com toda a conveniência.
      </P>

      <P class="text-base leading-relaxed text-secondary-200 text-justify tracking-wide font-light">
        Por ser um <span class="text-amber-500 font-medium">Gato Café</span>, sua experiência visual e sensorial se completa com a presença ilustre dos nossos felinos residentes. Espere conhecer cada um deles durante a sua estadia. Contamos com a sua preferência! 🤍
      </P>
    </div>

    <div class="relative group justify-self-center md:justify-self-end">
      <div class="absolute -inset-1 bg-amber-600/20 blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
      <img 
        src="/images/catpuchino.jpg" 
        alt="Café delicioso Cappuccino" 
        class="w-[350px] h-[350px] md:w-[400px] md:h-[400px] object-cover grayscale contrast-125 opacity-70 group-hover:scale-105 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700 border border-neutral-900"
      />
    </div>
  </section>

</main>