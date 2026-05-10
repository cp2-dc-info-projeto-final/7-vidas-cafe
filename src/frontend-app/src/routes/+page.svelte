<script lang="ts">
  import { Heading } from 'flowbite-svelte';
  import Menu from '../components/Menu.svelte';
  import {  P, ImagePlaceholder, Skeleton, TextPlaceholder } from "flowbite-svelte";
</script>

<Menu />

<div class="text-center p-8 pt-32">
	<Heading tag="h2" class="text-4xl font-extrabold tracking-tight text-secondary-50: dark:text-white mb-6">Home</Heading>
	<P class="text-lg leading-relaxed text-secondary-900 dark:text-gray-300 mb-4 text-justify">
    Seja bem-vindo à nossa cafeteria, “Sete Vidas Café”. Servimos cafés, sobremesas e salgados de altíssima qualidade.
    Em nossa cafeteria, contamos com um sistema de entregas e encomendas. Você pode retirar seu pedido em nossa loja física ou solicitar a entrega.
    Nossa cafeteria é um gato café, portanto, espere conhecer um dos nossos, ou talvez todos os nossos, felinos!
    Contamos com a sua preferência!! 🤍
	</P>
	<img src="/images/cappuccinno.png" alt="cafe delicious" height="300px" width="300px">
</div>