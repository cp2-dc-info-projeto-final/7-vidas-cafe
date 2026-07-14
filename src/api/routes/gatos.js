var express = require('express');
var router = express.Router();
const pool = require('../db/config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verifyToken, isAdmin } = require('../middlewares/auth');

// Funções utilitárias padronizadas de resposta
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

/* GET - Buscar todos os gatos */
// Ajustado de '/gatos' para '/' para que o endpoint final seja 'GET /api/gatos'
router.get('/', async function(req, res) {
  try {
    const result = await pool.query('SELECT id, nome, idade, raca, castracao, personalidade, adocao, tutor, imagem FROM gatos ORDER BY id');
    return sendSuccess(res, 200, null, result.rows);
  } catch (error) {
    console.error('Erro ao buscar gatos:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* POST - Adicionar gato (Apenas Admin) */
// Caminho final: POST /api/gatos
router.post('/', verifyToken, isAdmin, async function(req, res) {
  try {
    const { nome, idade, raca, castracao, personalidad, adocao, tutor = null, imagem = null } = req.body;
    const personalidade = personalidad || req.body.personalidade; // Garante compatibilidade

    if (!nome || idade === undefined || !raca || castracao === undefined || !personalidade || adocao === undefined) {
      const errors = [];
      if (!nome) errors.push({ field: 'nome', message: 'Nome é obrigatório', code: 'REQUIRED' });
      if (isNaN(idade)) errors.push({ field: 'idade', message: 'Idade é obrigatória', code: 'REQUIRED' });
      if (!raca) errors.push({ field: 'raca', message: 'Raça é obrigatória', code: 'REQUIRED' });
      if (castracao === undefined) errors.push({ field: 'castracao', message: 'Status de castração é obrigatório', code: 'REQUIRED' });
      if (!personalidade) errors.push({ field: 'personalidade', message: 'Personalidade é obrigatória', code: 'REQUIRED' });
      if (adocao === undefined) errors.push({ field: 'adocao', message: 'Status de adoção é obrigatório', code: 'REQUIRED' });

      return sendError(res, 400, 'Todos os campos do felino são obrigatórios', errors);
    }

    if (parseInt(idade) < 0) {
      return sendError(res, 400, 'Dados inválidos.', [{ field: 'idade', message: 'A idade não pode ser menor que zero.', code: 'INVALID_VALUE' }]);
    }

    const tutorId = (tutor && tutor !== "") ? parseInt(tutor) : null;

    const result = await pool.query(
      `INSERT INTO gatos (nome, idade, raca, castracao, personalidade, adocao, tutor, imagem) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, nome, idade, raca, castracao, personalidade, adocao, tutor, imagem`,
      [nome, parseInt(idade), raca, castracao, personalidade, adocao, tutorId, imagem]
    );

    return sendSuccess(res, 201, 'Gato adicionado com sucesso', result.rows[0]);
  } catch (error) {
    console.error('Erro ao inserir gato:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* PUT - Editar gato (Apenas Admin) */
// Caminho final: PUT /api/gatos/:id
router.put('/:id', verifyToken, isAdmin, async function(req, res) {
  try {
    const { id } = req.params;
    const { nome, idade, raca, castracao, personalidade, adocao, tutor, imagem } = req.body;

    const gatoResult = await pool.query('SELECT * FROM gatos WHERE id = $1', [id]);
    if (gatoResult.rows.length === 0) return sendError(res, 404, 'Gato não encontrado');

    const atual = gatoResult.rows[0];

    const finalNome = (nome !== undefined) ? nome.trim() : atual.nome;
    const finalIdade = (idade !== undefined) ? parseInt(idade) : atual.idade;
    const finalRaca = (raca !== undefined) ? raca.trim() : atual.raca;
    const finalCastracao = (castracao !== undefined) ? castracao : atual.castracao;
    // Corrigido 'personality.trim()' para 'finalPersonalidade' consistente:
    const finalPersonalidade = (personalidade !== undefined) ? personalidade.trim() : atual.personalidade;
    const finalAdocao = (adocao !== undefined) ? adocao : atual.adocao;
    
    const finalTutor = (tutor && tutor !== "") ? parseInt(tutor) : null;
    const finalImagem = (imagem !== undefined) ? imagem : atual.imagem;

    if (finalIdade < 0) return sendError(res, 400, 'A idade do gato não pode ser negativa.');

    const result = await pool.query(
      `UPDATE gatos 
       SET nome = $1, idade = $2, raca = $3, castracao = $4, personalidade = $5, adocao = $6, tutor = $7, imagem = $8
       WHERE id = $9 
       RETURNING id, nome, idade, raca, castracao, personalidade, adocao, tutor, imagem`,
      [finalNome, finalIdade, finalRaca, finalCastracao, finalPersonalidade, finalAdocao, finalTutor, finalImagem, id]
    );

    return sendSuccess(res, 200, 'Gato atualizado com sucesso', result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar gato:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* DELETE - Remover gato (Apenas Admin) */
// Caminho final: DELETE /api/gatos/:id
router.delete('/:id', verifyToken, isAdmin, async function(req, res) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo) return sendError(res, 400, 'É necessário informar o motivo da exclusão.');

    const gatoResult = await pool.query('SELECT id FROM gatos WHERE id = $1', [id]);
    if (gatoResult.rows.length === 0) return sendError(res, 404, 'Gato não encontrado');

    await pool.query('DELETE FROM gatos WHERE id = $1', [id]);
    console.log(`[AUDITORIA] Gato ID ${id} deletado. Motivo: ${motivo}`);

    return sendSuccess(res, 200, `Gato removido com sucesso (${motivo}).`);
  } catch (error) {
    console.error('Erro ao deletar gato:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

module.exports = router;