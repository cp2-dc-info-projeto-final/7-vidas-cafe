<script lang="ts">
  import { Heading } from 'flowbite-svelte';
  import Menu from '../components/Menu.svelte';
  import {  P, ImagePlaceholder, Skeleton, TextPlaceholder } from "flowbite-svelte";
</script>

<Menu />

<div class="text-center p-8 pt-32">
	<Heading tag="h2" class="text-4xl font-extrabold tracking-tight text-[#573104] dark:text-white mb-6">Home</Heading>
	<P class="text-lg leading-relaxed text-gray-700 dark:text-gray-300 mb-4 text-justify">
		Seja bem vindo à nossa cafeteria "Sete Vidas Café". Entregamos café, sobremesas e salgados de uma grandissima qualidade.
    Na nossa cafeteria, temos um sistema de entregas e encomendas. Você tanto retirar na nossa loja fisica
    quanto você pode solicitar a entrega. Nossa cafeteria é um gato café, portanto pode esperar conhecer
    um dos nossos, ou se não todos, felinos! Contamos com sua preferencia!! 🤍
	</P>
	<img src="/images/cappuccinno.png" alt="cafe delicious" height="300px" width="300px">
</div>