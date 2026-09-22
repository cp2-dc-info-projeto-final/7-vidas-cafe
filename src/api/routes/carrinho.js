var express = require('express');
var router = express.Router();
const pool = require('../db/config');
const { verifyToken } = require('../middlewares/auth');

function sendSuccess(res, status, message, data) {
    const payload = { success: true };
    if (message) payload.message = message;
    if (typeof data !== 'undefined') payload.data = data;
    return res.status(status).json(payload);
}

function sendError(res, status, message, errors = []) {
    return res.status(status).json({
        success: false,
        message,
        errors
    });
}

/* Função auxiliar para recalcular e atualizar os totais do carrinho */
async function atualizarTotaisCarrinho(client, carrinhoId) {
    const resItens = await client.query(
        'SELECT SUM(quantidade) as qtd_total, SUM(subtotal) as preco_soma FROM itens_carrinho WHERE carrinho_id = $1',
        [carrinhoId]
    );
    const qtdTotal = resItens.rows[0].qtd_total || 0;
    const precoTotal = resItens.rows[0].preco_soma || 0;

    await client.query(
        'UPDATE carrinho SET quantidade = $1, preco_total = $2 WHERE id = $3',
        [qtdTotal, precoTotal, carrinhoId]
    );

    return { quantidade: qtdTotal, preco_total: Number(precoTotal).toFixed(2) };
}

/* GET - Buscar o carrinho do usuário logado */
router.get('/', verifyToken, async function(req, res) {
    try {
        const usuarioId = req.user.id;

        let carrinhoResult = await pool.query('SELECT * FROM carrinho WHERE usuario_id = $1', [usuarioId]);
        
        let carrinhoData;
        if (carrinhoResult.rows.length === 0) {
            const novoCarrinho = await pool.query(
                'INSERT INTO carrinho (usuario_id, quantidade, preco_total) VALUES ($1, 0, 0) RETURNING *',
                [usuarioId]
            );
            carrinhoData = novoCarrinho.rows[0];
        } else {
            carrinhoData = carrinhoResult.rows[0];
        }

        const carrinhoId = carrinhoData.id;

        const itensResult = await pool.query(`
            SELECT ic.id, ic.cardapio_id, ic.quantidade, ic.subtotal, ic.preco_unitario,
                   c.nome, c.preco, c.imagem, c.resumo,
                   c.promocao, c.iniciopromocao, c.fimpromocao
            FROM itens_carrinho ic
            JOIN cardapio c ON ic.cardapio_id = c.id
            WHERE ic.carrinho_id = $1
            ORDER BY ic.id
        `, [carrinhoId]);

        const totaisAtualizados = await atualizarTotaisCarrinho(pool, carrinhoId);

        return sendSuccess(res, 200, null, {
            carrinho: {
                id: carrinhoId,
                quantidade: totaisAtualizados.quantidade,
                preco_total: totaisAtualizados.preco_total
            },
            itens: itensResult.rows
        });
    } catch (error) {
        console.error('Erro ao buscar carrinho:', error);
        return sendError(res, 500, 'Erro interno do servidor');
    }
});

/* POST - Adicionar item ao carrinho (Considerando preço promocional se vigente) */
router.post('/adicionar', verifyToken, async function(req, res) {
    const client = await pool.connect();
    try {
        const usuarioId = req.user.id;
        const { cardapio_id, quantidade } = req.body;
        const qtd = quantidade && quantidade > 0 ? parseInt(quantidade) : 1;

        if (!cardapio_id) {
            return sendError(res, 400, 'O ID do item do cardápio é obrigatório.');
        }

        // Busca o item e calcula se está em promoção no momento atual
        const itemCardapioQuery = `
            SELECT id, preco, promocao, iniciopromocao, fimpromocao,
                   CASE 
                       WHEN promocao IS NOT NULL 
                            AND (iniciopromocao IS NULL OR CURRENT_TIMESTAMP >= iniciopromocao) 
                            AND (fimpromocao IS NULL OR CURRENT_TIMESTAMP <= fimpromocao) 
                       THEN ROUND(preco * (1 - promocao / 100.0), 2)
                       ELSE preco
                   END AS preco_efetivo
            FROM cardapio 
            WHERE id = $1
        `;
        const itemCardapio = await client.query(itemCardapioQuery, [cardapio_id]);
        
        if (itemCardapio.rows.length === 0) {
            return sendError(res, 404, 'Item não encontrado no cardápio.');
        }
        
        const precoUnitario = Number(itemCardapio.rows[0].preco_efetivo);

        let carrinhoResult = await client.query('SELECT id FROM carrinho WHERE usuario_id = $1', [usuarioId]);
        let carrinhoId;

        if (carrinhoResult.rows.length === 0) {
            const novoCarrinho = await client.query(
                'INSERT INTO carrinho (usuario_id, quantidade, preco_total) VALUES ($1, 0, 0) RETURNING id',
                [usuarioId]
            );
            carrinhoId = novoCarrinho.rows[0].id;
        } else {
            carrinhoId = carrinhoResult.rows[0].id;
        }

        const itemExistente = await client.query(
            'SELECT id, quantidade FROM itens_carrinho WHERE carrinho_id = $1 AND cardapio_id = $2',
            [carrinhoId, cardapio_id]
        );

        if (itemExistente.rows.length > 0) {
            const novaQtd = itemExistente.rows[0].quantidade + qtd;
            const novoSubtotal = novaQtd * precoUnitario;

            await client.query(
                'UPDATE itens_carrinho SET quantidade = $1, preco_unitario = $2, subtotal = $3 WHERE id = $4',
                [novaQtd, precoUnitario, novoSubtotal, itemExistente.rows[0].id]
            );
        } else {
            const subtotal = qtd * precoUnitario;
            await client.query(
                'INSERT INTO itens_carrinho (carrinho_id, cardapio_id, quantidade, preco_unitario, subtotal) VALUES ($1, $2, $3, $4, $5)',
                [carrinhoId, cardapio_id, qtd, precoUnitario, subtotal]
            );
        }

        await atualizarTotaisCarrinho(client, carrinhoId);

        return sendSuccess(res, 200, 'Item adicionado ao carrinho com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar item ao carrinho:', error);
        return sendError(res, 500, 'Erro interno do servidor');
    } finally {
        client.release();
    }
});

/* PUT - Atualizar a quantidade de um item específico no carrinho */
router.put('/item/:id', verifyToken, async function(req, res) {
    const client = await pool.connect();
    try {
        const usuarioId = req.user.id;
        const itemId = req.params.id;
        const { quantidade } = req.body;

        const qtd = parseInt(quantidade);
        if (isNaN(qtd) || qtd < 1) {
            return sendError(res, 400, 'A quantidade deve ser um número inteiro maior que zero.');
        }

        const checkItem = await client.query(`
            SELECT ic.id, ic.carrinho_id, 
                   CASE 
                       WHEN c.promocao IS NOT NULL 
                            AND (c.iniciopromocao IS NULL OR CURRENT_TIMESTAMP >= c.iniciopromocao) 
                            AND (c.fimpromocao IS NULL OR CURRENT_TIMESTAMP <= c.fimpromocao) 
                       THEN ROUND(c.preco * (1 - c.promocao / 100.0), 2)
                       ELSE c.preco
                   END AS preco_efetivo
            FROM itens_carrinho ic
            JOIN carrinho car ON ic.carrinho_id = car.id
            JOIN cardapio c ON ic.cardapio_id = c.id
            WHERE ic.id = $1 AND car.usuario_id = $2
        `, [itemId, usuarioId]);

        if (checkItem.rows.length === 0) {
            return sendError(res, 404, 'Item não encontrado no seu carrinho.');
        }

        const carrinhoId = checkItem.rows[0].carrinho_id;
        const precoUnitario = Number(checkItem.rows[0].preco_efetivo);
        const novoSubtotal = qtd * precoUnitario;

        await client.query(
            'UPDATE itens_carrinho SET quantidade = $1, preco_unitario = $2, subtotal = $3 WHERE id = $4',
            [qtd, precoUnitario, novoSubtotal, itemId]
        );

        await atualizarTotaisCarrinho(client, carrinhoId);

        return sendSuccess(res, 200, 'Quantidade atualizada com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar quantidade do item:', error);
        return sendError(res, 500, 'Erro interno do servidor');
    } finally {
        client.release();
    }
});

/* DELETE - Remover um item específico do carrinho */
router.delete('/item/:id', verifyToken, async function(req, res) {
    const client = await pool.connect();
    try {
        const usuarioId = req.user.id;
        const itemId = req.params.id;

        const checkItem = await client.query(`
            SELECT ic.id, ic.carrinho_id 
            FROM itens_carrinho ic
            JOIN carrinho car ON ic.carrinho_id = car.id
            WHERE ic.id = $1 AND car.usuario_id = $2
        `, [itemId, usuarioId]);

        if (checkItem.rows.length === 0) {
            return sendError(res, 404, 'Item não encontrado no seu carrinho.');
        }

        const carrinhoId = checkItem.rows[0].carrinho_id;

        await client.query('DELETE FROM itens_carrinho WHERE id = $1', [itemId]);
        await atualizarTotaisCarrinho(client, carrinhoId);

        return sendSuccess(res, 200, 'Item removido do carrinho com sucesso!');
    } catch (error) {
        console.error('Erro ao remover item do carrinho:', error);
        return sendError(res, 500, 'Erro interno do servidor');
    } finally {
        client.release();
    }
});

/* DELETE - Limpar todo o carrinho do usuário */
router.delete('/limpar', verifyToken, async function(req, res) {
    const client = await pool.connect();
    try {
        const usuarioId = req.user.id;

        const carrinhoResult = await client.query('SELECT id FROM carrinho WHERE usuario_id = $1', [usuarioId]);
        if (carrinhoResult.rows.length === 0) {
            return sendSuccess(res, 200, 'Carrinho já está vazio.');
        }

        const carrinhoId = carrinhoResult.rows[0].id;

        await client.query('DELETE FROM itens_carrinho WHERE carrinho_id = $1', [carrinhoId]);
        await client.query('UPDATE carrinho SET quantidade = 0, preco_total = 0 WHERE id = $1', [carrinhoId]);

        return sendSuccess(res, 200, 'Carrinho limpo com sucesso!');
    } catch (error) {
        console.error('Erro ao limpar carrinho:', error);
        return sendError(res, 500, 'Erro interno do servidor');
    } finally {
        client.release();
    }
});

module.exports = router;