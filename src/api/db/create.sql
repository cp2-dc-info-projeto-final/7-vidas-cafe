DROP TABLE IF EXISTS usuario CASCADE;

CREATE TABLE usuario (
    id bigint GENERATED ALWAYS AS IDENTITY,
    login text NOT NULL,
    email text NOT NULL,
    senha text NOT NULL,
    cpf TEXT NOT NULL,
    dat_nas DATE NOT NULL,
    num_tel TEXT NOT NULL,
    role text NOT NULL DEFAULT 'user',
    
    -- Constraints
    CONSTRAINT pk_usuario PRIMARY KEY (id),
    CONSTRAINT uk_usuario_login UNIQUE (login), -- unicidade
    CONSTRAINT uk_usuario_email UNIQUE (email), -- unicidade
    CONSTRAINT uk_usuario_cpf UNIQUE (cpf), -- unicidade
    CONSTRAINT uk_usuario_num_tel UNIQUE (num_tel), -- unicidade
    CONSTRAINT ck_usuario_login_length CHECK (length(login) >= 3 AND length(login) <= 50), -- comprimento
    CONSTRAINT ck_usuario_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'), -- formato de email com expressão regular
    CONSTRAINT ck_usuario_senha_length CHECK (length(senha) >= 6), -- comprimento mínimo
    CONSTRAINT ck_usuario_role_valid CHECK (role IN ('admin', 'user')),-- tipos de usuário
    CONSTRAINT ck_usuario_cpf_format CHECK (cpf ~ '^\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11}$'), -- pra formataçao de cpf brasileiro
    CONSTRAINT ck_usuario_num_tel_format CHECK (num_tel ~ '^\((1[1-9]|[2-9][1-9])\)(9[2-9]\d{3}|[2-5]\d{3})-\d{4}$')-- pare numero de telefone do formato brasileiro
 
);

DROP TABLE IF EXISTS cardapio CASCADE;

CREATE TABLE cardapio (
    id bigint GENERATED ALWAYS AS IDENTITY,
    nome TEXT NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    categoria TEXT NOT NULL,
    resumo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    imagem TEXT,
    CONSTRAINT pk_cardapio PRIMARY KEY(id),
    CONSTRAINT uk_cardapio_nome UNIQUE (nome),
    CONSTRAINT ck_cardapio_preco CHECK (preco >= 0)
);

DROP TABLE IF EXISTS gatos CASCADE;

CREATE TABLE gatos (
    id bigint GENERATED ALWAYS AS IDENTITY,
    nome TEXT NOT NULL,
    idade INT NOT NULL,
    raca TEXT NOT NULL,
    castracao BOOLEAN NOT NULL,
    personalidade TEXT NOT NULL,
    adocao BOOLEAN NOT NULL,
    tutor bigint,
    imagem TEXT,
    CONSTRAINT fk_gatos_usuario
    FOREIGN KEY (tutor)
        REFERENCES usuario(id)
        ON DELETE CASCADE,

    CONSTRAINT pk_gatos PRIMARY KEY(id),
    CONSTRAINT ck_gatos_idade CHECK (idade >= 0)
);

DROP TABLE IF EXISTS pedidos CASCADE;

CREATE TABLE pedidos (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    preco_pedido DECIMAL(10, 2) NOT NULL,
    endereco TEXT NOT NULL,
    form_pag TEXT NOT NULL,
    cupom TEXT,
    status_pedido TEXT NOT NULL DEFAULT 'pendente', -- Adicionado aqui!
    comprador BIGINT NOT NULL,
    
    CONSTRAINT fk_pedidos_usuario
        FOREIGN KEY (comprador) 
        REFERENCES usuario(id)
        ON DELETE CASCADE,

    CONSTRAINT ck_pedido_preco CHECK (preco_pedido >= 0),
CONSTRAINT ck_pedido_status CHECK (status_pedido IN ('pendente', 'preparando', 'saiu para entrega', 'entregue', 'cancelado'))
);

DROP TABLE IF EXISTS carrinho CASCADE;

CREATE TABLE carrinho(
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    quantidade INT NOT NULL DEFAULT 0,
    preco_total DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT fk_carrinho_usuario
        FOREIGN KEY (usuario_id)
        REFERENCES usuario(id)
        ON DELETE CASCADE,

    CONSTRAINT uk_carrinho_usuario UNIQUE (usuario_id),
    CONSTRAINT ck_carrinho_preco CHECK (preco_total >= 0)
);
DROP TABLE IF EXISTS itens_carrinho CASCADE;
CREATE TABLE itens_carrinho (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  carrinho_id BIGINT DEFAULT NULL,
  cardapio_id BIGINT NOT NULL,
  pedido_id BIGINT DEFAULT NULL,
  quantidade INT NOT NULL,
  preco_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
CONSTRAINT fk_item_cardapio
    FOREIGN KEY (cardapio_id) 
    REFERENCES cardapio(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_item_pedido
        FOREIGN KEY (pedido_id) 
        REFERENCES pedidos(id)
        ON DELETE SET NULL,
    
 CONSTRAINT fk_item_carrinho
    FOREIGN KEY (carrinho_id) 
    REFERENCES carrinho(id)
    ON DELETE CASCADE,
    CONSTRAINT ck_item_quantidade CHECK (quantidade > 0),
    CONSTRAINT uk_item_produto UNIQUE (carrinho_id, cardapio_id),
    CONSTRAINT ck_preco_unitario CHECK (preco_unitario >= 0),
    CONSTRAINT ck_subtotal CHECK (subtotal >= 0)
);


SET datestyle = 'ISO, DMY';

INSERT INTO usuario (login, email, senha, cpf, dat_nas, num_tel, role) VALUES
-- senha efelantinho
('cafe', 'setevidascafe@gmail.com', '$2a$12$/kVJBiwy/1q5cbSbNa77neiIdMBN4hQSajrH4ccS4vaiGfizj81bq', '123.456.789-00', '29/02/2000', '(21)92345-6789', 'admin'),
('zoroastra', 'zoroastra@gmail.com', '$2a$12$f2c.uHGHS4drfaz6HR870OLamkarD57kI.gkr4//Vbbp0vN9IrFfG','123.466.789-00', '29/03/2000', '(21)92345-6780', 'user'),
('Asafesseidon', 'sasafe@gmail.com', '$2a$12$e9VZ0uhJkKK84IygXLzMz.OVtGXGtQjVzp5Dg6Zf/vBApveWz088a', '123.456.789-67', '06/07/1967', '(21)96767-6767', 'admin');

INSERT INTO cardapio (nome, preco, categoria, resumo, descricao, imagem) VALUES
-- Bebidas e Cafés
('Café Expresso', 7.50, 'Bebidas', 'Café expresso encorpado com notas de chocolate amargo.', 'Nosso clássico expresso feito com grãos 100% arábica selecionados.', '/images/expresso.jpg'),
('Macchiato', 9.00, 'Bebidas', 'Expresso manchado com uma camada cremosa de leite vaporizado.', 'O equilíbrio perfeito entre a intensidade do café e a suavidade do leite.', '/images/Macchiato.jpg'),
('Café com Leite', 8.50, 'Bebidas', 'A clássica combinação de café fresco e leite quente.', 'Quentinho e reconfortante, perfeito para começar o dia.', '/images/cafécomleite.jpg'),
('Café Latte com Arte de Gato', 11.00, 'Bebidas', 'Latte cremoso com desenho especial de gatinho na espuma.', 'Arte em latte feita à mão pelos nossos baristas para alegrar sua visita.', '/images/cafecomlatteartdegato.jpg'),
('Mocha', 13.50, 'Bebidas', 'Café expresso, calda de chocolate rica, leite vaporizado e chantilly.', 'Para os amantes de café e chocolate em uma única xícara.', '/images/Mocha.jpg'),
('Frappuccino', 14.00, 'Bebidas', 'Bebida gelada batida com café, leite, gelo e cobertura de chantilly.', 'Refrescante, doce e cheio de energia para dias quentes.', '/images/Frappucino.jpg'),
('Iced Cocoa', 12.00, 'Bebidas', 'Cacau gelado cremoso com toque de baunilha.', 'Deliciosa bebida gelada à base de chocolate cremoso.', '/images/icedcocoa.jpg'),
('Chai Latte', 12.50, 'Bebidas', 'Chá preto aromático com especiarias indianas e leite vaporizado.', 'Especiarias quentinhas como canela, cardamomo e gengibre.', '/images/Chai latte.jpg'),
('Chá Verde', 9.50, 'Bebidas', 'Infusão revigorante de chá verde (Matcha ou folhas selecionadas).', 'Leve, saudável e cheio de antioxidantes.', '/images/chaverde.jpg'),
('Chá Preto', 9.00, 'Bebidas', 'Chá preto tradicional servido quente ou gelado.', 'Sabor marcante e revigorante.', '/images/chapreto.jpg'),
('Suco de Laranja', 10.00, 'Bebidas', 'Suco 100% natural espremido na hora.', 'Vitamina C pura, refrescante e sem aditivos.', '/images/sucolaranj.jpg'),
('Suco de Uva', 10.00, 'Bebidas', 'Suco de uva integral e saboroso.', 'Rico em sabor e nutrientes.', '/images/sucouva.jpg'),
('Guarana', 6.50, 'Bebidas', 'Refrigerante de guaraná geladinho.', 'O clássico refresco brasileiro.', '/images/Guaraná.jpg'),
('Guaravita', 4.50, 'Bebidas', 'O tradicional e amado mate/guaraná natural gelado.', 'Geladinho e perfeito para qualquer hora.', '/images/guaravita.jpg'),
('Coca-Cola', 7.00, 'Bebidas', 'Refrigerante Coca-Cola bem gelado.', 'Acompanha perfeitamente qualquer salgado.', '/images/Coca cola.jpg'),

-- Salgados e Lanches
('Pão de Queijo', 8.00, 'Salgados', 'Pãezinhos de queijo artesanais quentinhos (porção).', 'Feitos com queijo minas curado, crocantes por fora e macios por dentro.', '/images/paodequeijo.jpg'),
('Misto Quente', 9.50, 'Salgados', 'Pão na chapa tostado com presunto e queijo derretido.', 'Clássico da lanchonete, crocante e quentinho.', '/images/misto quente.jpg'),
('Croissant', 10.50, 'Salgados', 'Croissant amanteigado, leve e folhado.', 'Massa francesa artesanal derretendo na boca.', '/images/croassaint.jpg'),
('Coxinha', 9.00, 'Salgados', 'Coxinha de frango desfiado com catupiry bem crocante.', 'Massa sequinha e recheio extremamente suculento.', '/images/coxinhars.jpg'),
('Empadão de Frango', 11.00, 'Salgados', 'Fatia de empadão de frango com massa podre que desfaz.', 'Recheio cremoso e generoso.', '/images/empadaofrang.jpg'),
('Joelho de Queijo e Presunto', 9.00, 'Salgados', 'Salgado assado recheado com queijo e presunto.', 'Massa macia e recheio farto.', '/images/joelhodequeijocompresunto.jpg'),
('Pão com Mortadela', 10.00, 'Salgados', 'Pão francês fresquinho com camadas generosas de mortadela.', 'Estilo clássico de mercado, muito recheado.', '/images/pao com mortadela.jpg'),
('Sanduíche Natural', 12.00, 'Salgados', 'Sanduíche natural de frango desfiado com cenoura ralada e maionese leve.', 'Opção leve e saudável.', '/images/sanduiche.jpg'),
('Pastel com Caldo de Cana', 14.00, 'Salgados', 'Pastel crocante acompanhado de um copo de caldo de cana fresco.', 'A dupla perfeita da feira direto para o nosso café.', '/images/pastel com caldo de cana.jpg'),

-- Sobremesas e Doces
('Bolo de Chocolate', 12.00, 'Doces', 'Fatia de bolo de chocolate fofinho com cobertura cremosa.', 'Para os verdadeiros chocólatras.', '/images/chocolate cake.jpg'),
('Bolo de Morango', 13.00, 'Doces', 'Bolo recheado com creme leve e morangos frescos.', 'Doce na medida certa com frutas selecionadas.', '/images/cakemoranguis.jpg'),
('Red Velvet Cake', 13.50, 'Doces', 'Fatia do clássico bolo avermelhado com cobertura de cream cheese.', 'Textura aveludada e sabor inconfundível.', '/images/red velvet  cake.jpg'),
('Tiramisu', 14.00, 'Doces', 'Tradicional sobremesa italiana com café, mascarpone e cacau.', 'Delicadamente cremoso e com toque marcante de café.', '/images/tiramisu.jpg'),
('Cheesecake', 13.00, 'Doces', 'Cheesecake cremoso com calda de frutas vermelhas.', 'Base de biscoito crocante com cobertura agridoce.', '/images/cheeseckae.jpg'),
('Pudim', 9.00, 'Doces', 'Pudim de leite condensado lisinho com calda de caramelo.', 'Receita tradicional que derrete na boca.', '/images/pudim.jpg'),
('Brownie', 10.00, 'Doces', 'Brownie de chocolate meio amargo com casquinha crocante.', 'Molhadinho por dentro e intenso.', '/images/brownie.jpg'),
('Torta de Cookie', 11.00, 'Doces', 'Fatia de torta com base de cookie recheada com gotas de chocolate.', 'Crocante por fora e macia por dentro.', '/images/torta de cookie.jpg'),
('Cookie', 6.00, 'Doces', 'Cookie artesanal com gotas de chocolate belga.', 'Assado na hora para manter a maciez.', '/images/cookie.jpg'),
('Donut', 8.50, 'Doces', 'Donut fofinho com cobertura de chocolate e confeitos.', 'Doce, divertido e delicioso.', '/images/donut.jpg');

INSERT INTO gatos (nome, idade, raca, castracao, personalidade, adocao, tutor, imagem) VALUES
('Bey', 2, 'SRD (Pelo Longo)', TRUE, 'Elegante, calmo e adora observar o movimento do café de cima da bancada.', TRUE, NULL, '/images/bey.jpg'),
('Atsushi', 3, 'Angorá (Preto)', TRUE, 'Misterioso, dócil e muito carinhoso com quem ganha sua confiança.', TRUE, NULL, '/images/atsushi.jpg'),
('Alan', 4, 'SRD (Preto e Branco)', TRUE, 'Dorminhoco profissional, adora tirar uma soneca em locais aconchegantes.', TRUE, NULL, '/images/alan.jpg'),
('Banoffe', 1, 'Tartaruga (Calico)', FALSE, 'Filhote brincalhona, curiosa e cheia de energia para interagir.', TRUE, NULL, '/images/banoffe.jpg'),
('Cloud', 1, 'Siamês', FALSE, 'Dengo, adora um colo e conquista todo mundo com os olhos azuis.', TRUE, NULL, '/images/cloud.jpg');