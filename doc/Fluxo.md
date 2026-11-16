## Casos de Uso:

### Caso de uso 1: Cadastro de cliente.

#### Atores:

- Cliente.
  
#### Fluxo principal:

- O cliente clica no botão "Login".

- O cliente clica no link "Cadastre-se".
  
- O sistema leva o cliente até a tela de registro contendo um formulário.
  
- O cliente preenche os campos do formulário (informando nome de usuário, email, senha, cpf, data de nascimento e número de telefone).
  
- O sistema consulta o banco de dados para verificar a disponibilidade das informações fornecidas.
  
- O banco de dados retorna uma confirmação positiva.
  
- O sistema realiza o cadastro, salvando os dados do novo cliente.
  
- O sistema encaminha o cliente para a página principal do site.

#### Fluxo Alternativo A: O email já está cadastrado

- O sistema apresenta formulário de cadastro.
 
- O usuário preenche os campos.

- O sistema consulta o banco de dados.

- O banco de dados retorna que o email informado já está em uso.

- O sistema exibe uma mensagem de erro informando que o email digitado já está em uso.

- O usuário digita um novo email no formulário e tenta novamente.

- O sistema registra as informações no banco de dados e informa usuário.

#### Fluxo Alternativo A: Campo vazio

- O sistema apresenta formulário de cadastro.

- O usuário não preenche um dos campos e clica no botão de "Criar Conta"

- O sistema analisa os campos de cadastro e pede que o usuário preencha todos os campos.

- O usuário preenche todos os campos  e clica no botão de "Criar Conta".

- O sistema registra as informações no banco de dados e informa usuário.

### Caso de Uso 2: Login.

#### Atores: 

- Usuário

#### Fluxo principal:

- O clinte seleciona a opção "Login".

- O sistema leva o cliente até a tela de preenchimento de senha e email.

- cliente preenche os campos "Usuário ou E-mail" e "Senha".

- O sistema consulta o banco de dados para a confirmação dos dados inseridos.

- O banco de dados retorna uma confirmação positiva.

- O sistema encaminha o cliente para a página principal do site.

#### Fluxo Alternativo A: Email inválido

- O sistema apresenta a página de formulário de Login.

- O usuário insere um email.

- O sistema consulta o banco de dados.

- O banco de dados retorna que o email informado já está em uso.

- O sistema exibe uma mensagem dizendo que o email está inválido e sugere que o usuário digite outro email.

#### Fluxo Alternativo B: Campo vazio

- O sistema apresenta a página de formulário de Login.

- O usuário não preenche um dos campos e clica no botão de "Login".

- O sistema analisa os campos de cadastro e pede que o usuário preencha todos os campos.

- O usuário preenche todos os campos (insere email e senha)  e clica no botão de "Login".

- O sistema verifica no banco de dados se as informações estão corretas.

- O banco de dados retorna verdadeiro.

- O sistema redireciona o usuário para a página inicial do site.

### Caso de Uso 3: Excluir cliente.

#### Atores: 

- cliente

#### Fluxo principal: 

- O cliente acessa o menu do seu perfil com as configurações da sua conta.

- O cliente aperta o botão excluir conta.

- O sistema solicita a senha do cliente para proseguir com a exclusão.
  
- O cliente digita a senha.
  
- O sistema analisa a veracidade da senha no banco de dados.
  
- O banco de dados retorna uma confirmação positiva.
  
- O sistema pergunta se quer confirmar a exclusão.
  
- O cliente aperta o botão confirmar.
  
- O sistema apaga os dados do cliente no banco de dados.
  
- O sistema apresenta mensagem de sucesso.
  
- O sistema realoca o cliente para a página de login e cadastro.

#### Fluxo Alternativo A: Senha incorreta.

- O usuário acessa o menu do seu perfil com as configurações da sua conta e aperta no botão "Excluir conta".

- O sistema pede que o usuário insira senha para continuar.

- O usuário insere a senha.

- O sistema verifica no banco de dados se a senha está correta.

- O banco de dados retorna negativo.

- O sistema envia uma mensagem de erro e pede que ao usuário que ele insira a senha correta.

- O usuário insere a senha correta.

- O sistema verifica no banco de dados se a senha está correta.

- O banco de dados retorna uma confirmação positiva.

- O sistema envia uma mensagem de sucesso e envia o usuário para a página de cadastro e login. 

### Caso de Uso 4: Editar dados de cadastro.

#### Atores: 

- cliente

#### Fluxo principal: 

- O cliente acessa o menu do seu perfil com as configurações da sua conta.

- O cliente aperta o botão "editar" no campo específico que deseja mudar.

- O cliente edita dados do seu cadastro e aperta o botão confirmar.
  
- O sistema edita os dados do cliente no banco de dados.

#### Fluxo Alternativo A: Cancelar edição

- O usuário acessa o menu do seu perfil com as configurações da sua conta.

- O cliente aperta o botão "editar" no campo específico que deseja mudar.
  
- O sistema exibe os dados de cadastro do usuário.

- O usuário decide que não quer mais editar e aperta o botão cancelar.

- O sistema redireciona o usuário para o menu do seu perfil com as configurações da sua conta.

### Caso de Uso 5: Logout

#### Atores: 

- cliente

#### Fluxo principal:  

- O cliente acessa o menu do seu perfil com as configurações da sua conta e aperta o botão de "Logout".

- O sistema apresenta uma mensagem perguntando "Quer confirmar o Logout?".

- O cliente confirma.

- O sistema apaga o login do cliente.

- O sistema realoca o cliente para o menu do seu perfil com  as configurações da sua conta.


#### Fluxo Alternativo A: Cancelar Logout

- O usuário acessa o menu do seu perfil com as configurações da sua conta e aperta o botão de "Logout".

- O sistema apresenta uma mensagem perguntando "Quer confirmar o Logout?".

- O usuário decide que não quer mais fazer Logout e aperta o botão cancelar.

- O sistema redireciona o usuário para o menu do seu perfil com  as configurações da sua conta.

### Caso de Uso 6: Busca de produtos.

#### Atores: 

- cliente

#### Fluxo principal: 

- O sistema apresenta a página inicial do site.

- O cliente aperta em "Cardápio" e é redirecionado para a aba de mesmo nome.

- O cliente clica na barra de pesquisa e pesquisa pelo item desejado.

- O sistema consulta automaticamente no banco de dados.

- O banco retorna a refeição desejada.

- A busca é finalizada.



#### Fluxo Alternativo A: Campo vazio

- O sistema apresenta a página inicial do site.

- O cliente aperta em "Cardápio" e é redirecionado para a aba de mesmo nome.

- O cliente clica na barra de pesquisa.

- O usuário não preenche o campo e aperta a barra de pesquisa.

- O sistema automaticamente analisa o barra de pesquisa.

- O sistema nada retorna.


### Caso de uso 7: Carrinho de compras.

#### Atores: 

- CLiente

#### Fluxo principal:  

- O cliente clica na aba "Cardápio".

- O cliente scolhe os itens desejados.

- O cliente clica no ícone de "Carrinho de Compras".

- O sistema redireciona o cliente para a página contendo os itens desejados.

- O cliente pode iniciar o processo de compra dos produtos desejados.

- O cliente preenche o cadastro com suas informações de endereço.

- O cliente seleciona uma forma de pagamento.
  
- O cliente finaliza a compra e é redirecionado para a pagina inicial.

### Caso de Uso 8: Adoção de gatos.

#### Atores:

- cliente

#### Fluxo Principal:

- O cliente clica na aba "Gatos".

- O sistema redireciona o cliente para a página contendo vários gatos.

- O cliente clica no gato desejado para saber suas informações.

- Se o gato for adotavel, o cliente clica em "Contate-nos" caso desejar adota-lo.

- O sitema disponibiliza o contato de whatsapp da cafeteria.

#### Fluxo Alternativo A: O gato não é adotável.

- O cliente clica no ícone "Gatos".

- O sistema redireciona o cliente para a página contendo vários gatos.

- O cliente clica no gato desejado para saber suas informações.

- Se o gato não for adotável, o cliente clica na opção "Voltar".

- O sistema redireciona o cliente para a aba "Gatos".

### Caso de Uso 9: Editar carrinho de compras.

#### Atores: 

- Cliente

#### Fluxo principal:  

- O cliente clica no ícone do "carrinho de compras".

- O sistema redireciona o cliente para a página contendo os itens desejados.

- O cliente clica no botão "Remover produto" para remoção do iten ou modifica a quantidade de itens no carrinho clicando no "+" ou "-" para adicionar ou diminuir respectivamente.

- O carrinho é atualizado. 


### Caso de Uso 10: Gerenciar Catálogo de produtos.

#### Atores: 

- Administrador 

#### Fluxo principal: 

- o Administrador clica na aba "Cardápio".

- Visualiza a lista de produtos cadastrados.

- Clica em "Adicionar Produto".

- Preenche as informações do produto (nome, descrição, preço, imagem, categoria).

- Clica em "Salvar".

- O sistema adiciona o novo produto ao catálogo.

#### Fluxo Alternativo A: Editar Catálogo de produtos.

- O Administrador acessa o sistema.

- Seleciona a opção "Catálogo de Produtos".

- Visualiza a lista de produtos cadastrados.

- O Administrador clica no item desejado para edição.

- O Administrador clica em "Editar item".

- O Administrador pode alterar as informações do prdouto (nome, descrição, preço, imagem, categoria).

- O Administrador clica em "salvar".

- O sistema retorna para o banco de dados.

- O sistema atualiza a pagina.

#### Fluxo Alternativo B: Excluir produto do Catálogo de Produtos.

- O administrador acessa o sistema.

- Seleciona a aba "Cardápio".

- Visualiza a lista de produtos cadastrados.

- O administrador clica no item desejado para remoção.

- O admnistrador clica em "Remover produto".

- O administrador clica em "Confirmar Exclusão".

- O sistema retorna para o banco de dados.

- o sistema atualiza a pagina.

### Caso de Uso 11: Editar pedidos.

#### Atores:

- Administrador

#### Fluxo principal: 

- O administrador acessa o sistema.

- O administrador seleciona "Pedidos" e visualiza.

- O administrador clica em um pedido para ver detalhes.

- O administrador atualiza o status do pedido, por exemplo, "em entrega", "concluído" ou "Encomenda pronta para retirada".

- O sistema registra a atualização.

### Caso de Uso 12: Administrar clientes. 

#### Atores: 

- Administrador

#### Fluxo principal: Visualizar Cliente

- O administrador acessa o sistema.

- O administrador vai até a seção "Clientes".

- O administrador visualiza a lista de clientes cadastrados.

- O administrador clica sobre um cliente para ver detalhes.

- O administrador pode optar por editar ou excluir o cadastro.

#### Fluxo Alternativo A: Editar clientes.

- O administrador acessa o sistema.

- O administrador vai até a seção "Clientes".

- O administrador visualiza a lista de clientes cadastrados.

- O administrador clica em "Editar" no cliente desejado.

- O administrador modifica as informações do cliente(usuário, email, senha, cpf, data de nascimento e número de telefone).

- O administrador clica em "Salvar".

- O sistema atualiza o banco de dados.

#### Fluxo Alternativo B: Exluir clientes.

- O administrador acessa o sistema.

- O administrador vai até a seção "Clientes".

- O administrador visualiza a lista de clientes cadastrados.

- O administrador clica sobre um cliente para ver detalhes.

- O administrador clica em "Excluir".

- O sistema apaga os dados do cliente.

- O sistema atualiza.

### Caso de Uso 13: Gerenciar Promoções.

#### Atores:

- Administrador

#### Fluxo principal:

- O administrador clica na aba de "Cardápio".

- O administrador clica no item desejado.

- Na página do item, o administrador clica em "Adicionar promoção".

- Agora o Administrador escolhe qual a porcentagem da promoção e o tempo da promoção.

- O administrador aperta em "Confirmar".

- O item é atualizado com a novo valor e é adicionado na aba "Promoções".

#### Fluxo Alternativo A: Exluir Promoções.

- O administrador entra na aba "Promoções" ou "Cardápio.

- O administrador clica em um produto em promoção.

- O administrador clica em "Excluir promoção"

- O sistema pergunta se o administrador tem certeza desta ação.

- O administrador clica em "Sim".

- O sistema excluir a promoção e retira o produto da aba "Promoções".

### Caso de Uso 14: Gerenciar Gatos a mostra.

#### Atores:

- Administrador

#### Fluxo principal:

- O administrador clica na aba "Gatos".

- O administrador clica em "Adicionar gatos".

- O administrador coloca as caracteristicas do gato(Nome, Raça, Idade, Castração, Traço de Personalidade, Se ta pra adoção ou não).

- O administrador clica em "Salvar".

- O gato é adicionado a aba "Gatos".

#### Fluxo Alternativo A: Editar Gatos

- O administra clica na aba "Gatos".

- O administrador clica no gato desejado.

- O administrador clica em "Editar".

- O sistema abre uma aba com todas as informções editáveis do gato.

- O administrador altera as informações do gato.

- O administrador clica em "Salvar".

- O sistema atualiza com as novas informações do gato.

#### Fluxo Alternativo B: Excluir Gatos

- O administra clica na aba "Gatos".

- O administrador clica em "Opções".

- O administrador clica no gato desejado.

- O administrador clica em "Excluir gato".

- O sistema envia Opções do que pode ser o motivo da exclusão.

- O administrador escolhe uma opção e clica em "Confirmar Exclusão".

- O gato é removido.
