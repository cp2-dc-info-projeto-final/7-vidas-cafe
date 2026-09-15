const express = require('express');
const router = express.Router();
const pool = require('../db/config'); // Aponta para a sua conexão do banco
const { verifyToken, isAdmin } = require('../middlewares/auth');

// ==========================================
// 1. FINALIZAR COMPRA (Criar Pedido e Vincular Itens)
// ==========================================
router.post('/', verifyToken, async (req, res) => {
    const userId = req.user.id; // Extraído do token JWT
    const { endereco, form_pag, cupom } = req.body;

    if (!endereco || !form_pag) {
        return res.status(400).json({ message: 'Endereço e forma de pagamento são obrigatórios.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN'); // Inicia a transação no banco

        // A. Busca o carrinho do usuário
        const carrinhoRes = await client.query(
            'SELECT id, preco_total FROM carrinho WHERE usuario_id = $1',
            [userId]
        );

        if (carrinhoRes.rows.length === 0 || carrinhoRes.rows[0].preco_total <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Seu carrinho está vazio.' });
        }

        const carrinho = carrinhoRes.rows[0];

        // B. Verifica se existem itens ativos (sem pedido_id) nesse carrinho
        const itensRes = await client.query(
            'SELECT id FROM itens_carrinho WHERE carrinho_id = $1 AND pedido_id IS NULL',
            [carrinho.id]
        );

        if (itensRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Não há itens no carrinho para finalizar o pedido.' });
        }

        // C. Insere o registro principal na tabela 'pedidos'
        const pedidoInsert = await client.query(
            `INSERT INTO pedidos (preco_pedido, endereco, form_pag, cupom, comprador) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id, data_compra, preco_pedido`,
            [carrinho.preco_total, endereco, form_pag, cupom || null, userId]
        );

        const novoPedido = pedidoInsert.rows[0];

        // D. A IDEIA DO PROFESSOR: Atualiza os itens vinculando ao pedido_id e desvinculando do carrinho_id
        await client.query(
            `UPDATE itens_carrinho 
             SET pedido_id = $1, carrinho_id = NULL 
             WHERE carrinho_id = $2 AND pedido_id IS NULL`,
            [novoPedido.id, carrinho.id]
        );

        // E. Zera o total e quantidade do carrinho principal do usuário
        await client.query('UPDATE carrinho SET quantidade = 0, preco_total = 0 WHERE id = $1', [carrinho.id]);

        await client.query('COMMIT'); // Confirma todas as alterações no banco

        return res.status(201).json({
            message: 'Pedido realizado com sucesso!',
            pedido: novoPedido
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Desfaz tudo se der erro
        console.error('Erro ao finalizar pedido:', error);
        return res.status(500).json({ message: 'Erro interno ao processar o pedido.' });
    } finally {
        client.release();
    }
});

// ==========================================
// 2. LISTAR PEDIDOS DO USUÁRIO LOGADO
// ==========================================
router.get('/meus-pedidos', verifyToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const pedidosRes = await pool.query(
            `SELECT p.*, 
                json_agg(
                    json_build_object(
                        'id', ic.id,
                        'cardapio_id', ic.cardapio_id,
                        'nome_produto', c.nome,
                        'quantidade', ic.quantidade,
                        'preco_unitario', ic.preco_unitario,
                        'subtotal', ic.subtotal,
                        'imagem', c.imagem
                    )
                ) as itens
             FROM pedidos p
             JOIN itens_carrinho ic ON p.id = ic.pedido_id
             JOIN cardapio c ON ic.cardapio_id = c.id
             WHERE p.comprador = $1
             GROUP BY p.id
             ORDER BY p.data_compra DESC`,
            [userId]
        );

        return res.json(pedidosRes.rows);
    } catch (error) {
        console.error('Erro ao buscar pedidos do usuário:', error);
        return res.status(500).json({ message: 'Erro ao carregar histórico de pedidos.' });
    }
});

// ==========================================
// 3. LISTAR TODOS OS PEDIDOS (Área Admin)
// ==========================================
router.get('/admin/todos', verifyToken, isAdmin, async (req, res) => {
    try {
        const pedidosRes = await pool.query(
            `SELECT p.*, u.login as nome_comprador, u.email as email_comprador,
                json_agg(
                    json_build_object(
                        'nome_produto', c.nome,
                        'quantidade', ic.quantidade,
                        'subtotal', ic.subtotal
                    )
                ) as itens
             FROM pedidos p
             JOIN usuario u ON p.comprador = u.id
             JOIN itens_carrinho ic ON p.id = ic.pedido_id
             JOIN cardapio c ON ic.cardapio_id = c.id
             GROUP BY p.id, u.login, u.email
             ORDER BY p.data_compra DESC`
        );

        return res.json(pedidosRes.rows);
    } catch (error) {
        console.error('Erro ao listar todos os pedidos:', error);
        return res.status(500).json({ message: 'Erro ao carregar pedidos para administração.' });
    }
});

module.exports = router;