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

        if (carrinhoRes.rows.length === 0 || Number(carrinhoRes.rows[0].preco_total) <= 0) {
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

        // D. Atualiza os itens vinculando ao pedido_id e desvinculando do carrinho_id
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
        console.error('Erro detalhado ao finalizar pedido:', error);
        return res.status(500).json({ message: 'Erro interno ao processar o pedido: ' + error.message });
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
            `SELECT p.id, p.data_compra, p.preco_pedido, p.endereco, p.form_pag, p.cupom, p.status_pedido,
                COALESCE(
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
                    ) FILTER (WHERE ic.id IS NOT NULL), '[]'
                ) as itens
             FROM pedidos p
             LEFT JOIN itens_carrinho ic ON p.id = ic.pedido_id
             LEFT JOIN cardapio c ON ic.cardapio_id = c.id
             WHERE p.comprador = $1
             GROUP BY p.id
             ORDER BY p.data_compra DESC`,
            [userId]
        );

        return res.json(pedidosRes.rows);
    } catch (error) {
        console.error('Erro ao buscar pedidos do usuário:', error);
        return res.status(500).json({ message: 'Erro ao carregar histórico de pedidos: ' + error.message });
    }
});

// ==========================================
// 3. LISTAR TODOS OS PEDIDOS (Área Admin)
// ==========================================
router.get('/admin/todos', verifyToken, isAdmin, async (req, res) => {
    try {
        const pedidosRes = await pool.query(
            `SELECT p.*, u.login as nome_comprador, u.email as email_comprador,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'nome_produto', c.nome,
                            'quantidade', ic.quantidade,
                            'subtotal', ic.subtotal
                        )
                    ) FILTER (WHERE ic.id IS NOT NULL), '[]'
                ) as itens
             FROM pedidos p
             JOIN usuario u ON p.comprador = u.id
             LEFT JOIN itens_carrinho ic ON p.id = ic.pedido_id
             LEFT JOIN cardapio c ON ic.cardapio_id = c.id
             GROUP BY p.id, u.login, u.email
             ORDER BY p.data_compra DESC`
        );

        return res.json(pedidosRes.rows);
    } catch (error) {
        console.error('Erro ao listar todos os pedidos:', error);
        return res.status(500).json({ message: 'Erro ao carregar pedidos para administração.' });
    }
});

// ==========================================
// 4. BUSCAR PEDIDO ESPECÍFICO POR ID
// ==========================================
router.get('/:id', verifyToken, async (req, res) => {
    const pedidoId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const isAdminUser = userRole === 'admin';

    try {
        const pedidoRes = await pool.query(
            `SELECT p.id, p.data_compra, p.preco_pedido, p.endereco, p.form_pag, p.cupom, p.comprador,
                COALESCE(
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
                    ) FILTER (WHERE ic.id IS NOT NULL), '[]'
                ) as itens
             FROM pedidos p
             LEFT JOIN itens_carrinho ic ON p.id = ic.pedido_id
             LEFT JOIN cardapio c ON ic.cardapio_id = c.id
             WHERE p.id = $1
             GROUP BY p.id`,
            [pedidoId]
        );

        if (pedidoRes.rows.length === 0) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        const pedido = pedidoRes.rows[0];

        // Valida se o pedido pertence ao usuário ou se é admin
        if (pedido.comprador !== userId && !isAdminUser) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        return res.json(pedido);
    } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        return res.status(500).json({ message: 'Erro ao carregar o pedido.' });
    }
});

// ==========================================
// 5. ATUALIZAR STATUS DO PEDIDO (Área Admin)
// ==========================================
router.patch('/:id/status', verifyToken, isAdmin, async (req, res) => {
    const pedidoId = req.params.id;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'O novo status é obrigatório.' });
    }

    try {
        const updateRes = await pool.query(
            'UPDATE pedidos SET status = $1 WHERE id = $2 RETURNING *',
            [status, pedidoId]
        );

        if (updateRes.rows.length === 0) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        return res.json({
            message: 'Status atualizado com sucesso!',
            pedido: updateRes.rows[0]
        });
    } catch (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        return res.status(500).json({ message: 'Erro interno ao atualizar status.' });
    }
});

// ==========================================
// 6. CANCELAR PEDIDO
// ==========================================
router.delete('/:id', verifyToken, async (req, res) => {
    const pedidoId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const pedidoRes = await client.query(
            'SELECT id, comprador FROM pedidos WHERE id = $1',
            [pedidoId]
        );

        if (pedidoRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        const pedido = pedidoRes.rows[0];
        const isAdminUser = userRole === 'admin' || req.user.isAdmin === true;

        if (pedido.comprador !== userId && !isAdminUser) {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Você não tem permissão para cancelar este pedido.' });
        }

        await client.query(
            'DELETE FROM itens_carrinho WHERE pedido_id = $1',
            [pedidoId]
        );

        await client.query(
            'DELETE FROM pedidos WHERE id = $1',
            [pedidoId]
        );

        await client.query('COMMIT');

        return res.json({ message: 'Pedido cancelado com sucesso.' });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao cancelar pedido:', error);
        return res.status(500).json({ message: 'Erro interno ao cancelar o pedido: ' + error.message });
    } finally {
        client.release();
    }
});

module.exports = router;