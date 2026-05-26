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
    CONSTRAINT ck_usuario_cpf_format CHECK (cpf ~* '^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$'), -- pra formataçao de cpf brasileiro
    CONSTRAINT ck_usuario_num_tel_format CHECK (num_tel ~* '^\((1[1-9]|[2-9][1-9])\)(9[2-9]\d{3}|[2-5]\d{3})-\d{4}$')-- pare numero de telefone do formato brasileiro
 
);

DROP TABLE IF EXISTS cardapio CASCADE;

CREATE TABLE cardapio (
    id bigint GENERATED ALWAYS AS IDENTITY,
    nome TEXT NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    categoria TEXT NOT NULL,
    tamanho TEXT NOT NULL,
    descricao TEXT NOT NULL,
    imagem TEXT,
    CONSTRAINT pk_cardapio PRIMARY KEY(id),
    CONSTRAINT uk_cardapio_nome UNIQUE (nome)
);

DROP TABLE IF EXISTS gatos CASCADE;

CREATE TABLE gatos (
    id bigint GENERATED ALWAYS AS IDENTITY,
    nome TEXT NOT NULL,
    idade TEXT NOT NULL,
    raca TEXT NOT NULL,
    castracao TEXT NOT NULL,
    personalidade TEXT NOT NULL,
    adocao TEXT NOT NULL,
    tutor bigint,
    imagem TEXT,
    CONSTRAINT fk_gatos_usuario
    FOREIGN KEY (tutor)
        REFERENCES usuario(id)
        ON DELETE CASCADE,

    CONSTRAINT pk_gatos PRIMARY KEY(id),
    CONSTRAINT uk_gatos_nome UNIQUE (nome)
);

DROP Table IF EXISTS pedidos CASCADE;

CREATE Table pedidos(
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Data_compra DATE NOT NULL,
    preco_pedido DECIMAL(10, 2) NOT NULL,
    endereco TEXT NOT NULL,
    form_pag TEXT NOT NULL,
    cupom TEXT,
    produto BIGINT,
    CONSTRAINT fk_pedidos_cardapio
    Foreign Key (produto)
     REFERENCES cardapio(id)
     ON DELETE CASCADE,
    comprador BIGINT,
    CONSTRAINT fk_pedidos_usuario
    Foreign Key (comprador) 
        REFERENCES usuario(id)
        ON DELETE CASCADE
);
DROP TABLE IF EXISTS carrinho CASCADE;

CREATE TABLE carrinho(
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quantidade INT NOT NULL DEFAULT 1,
    preco_total DECIMAL(10, 2)
);

DROP TABLE IF EXISTS itens_carrinho CASCADE;
CREATE TABLE itens_carrinho (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  carrinho_id BIGINT NOT NULL,
  cardapio_id BIGINT NOT NULL,
  quantidade INT NOT NULL,
  preco_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
 CONSTRAINT fk_item_cardapio
    FOREIGN KEY (cardapio_id) 
    REFERENCES cardapio(id)
    ON DELETE CASCADE,
    
  CONSTRAINT fk_item_carrinho
    FOREIGN KEY (carrinho_id) 
    REFERENCES carrinho(id)
    ON DELETE CASCADE
);
SET datestyle = 'ISO, DMY';





INSERT INTO usuario (login, email, senha, cpf, dat_nas, num_tel, role) VALUES
-- senha efelantinho
('cafe', 'setevidascafe@email.com', '$2a$12$/kVJBiwy/1q5cbSbNa77neiIdMBN4hQSajrH4ccS4vaiGfizj81bq', '123.456.789-00', '29/02/2000', '(21)92345-6789', 'admin'),
('zoroastra', 'zoroastra@email.com', '$2a$12$f2c.uHGHS4drfaz6HR870OLamkarD57kI.gkr4//Vbbp0vN9IrFfG','123.466.789-00', '29/03/2000', '(21)92345-6780', 'user');
