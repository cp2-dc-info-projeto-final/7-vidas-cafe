var express = require('express');
var router = express.Router();
const pool = require('../db/config');
const { verifyToken, isAdmin } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração do armazenamento local com Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../public/static/images/gatos');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

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
router.get('/', async function(req, res) {
  try {
    // Tenta pegar o token do header caso o usuário esteja logado
    const authHeader = req.headers['authorization'];
    let isAdminUser = false;

    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const jwt = require('jsonwebtoken');
        // Certifique-se de usar a mesma chave secreta do seu middleware de auth
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sua_chave_secreta');
        if (decoded && decoded.role === 'admin') {
          isAdminUser = true;
        }
      } catch (err) {
        // Token inválido ou expirado, segue como usuário normal
      }
    }

    // Se for admin, busca todos. Se não for, busca apenas os disponíveis para adoção.
    let query = 'SELECT id, nome, idade, raca, castracao, personalidade, adocao, tutor, imagem FROM gatos';
    if (!isAdminUser) {
      query += ' WHERE adocao = true';
    }
    query += ' ORDER BY id';

    const result = await pool.query(query);
    return sendSuccess(res, 200, null, result.rows);
  } catch (error) {
    console.error('Erro ao buscar gatos:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* POST - Adicionar gato (Apenas Admin) com suporte a upload de imagem */
router.post('/', verifyToken, isAdmin, upload.single('imagem'), async function(req, res) {
  try {
    const { nome, idade, raca, castracao, personalidad, adocao, tutor = null } = req.body;
    const personalidade = personalidad || req.body.personalidade; 

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
    const imagemPath = req.file ? `/static/images/gatos/${req.file.filename}` : null;

    const result = await pool.query(
      `INSERT INTO gatos (nome, idade, raca, castracao, personalidade, adocao, tutor, imagem) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, nome, idade, raca, castracao, personalidade, adocao, tutor, imagem`,
      [nome, parseInt(idade), raca, castracao === 'true' || castracao === true, personalidade, adocao === 'true' || adocao === true, tutorId, imagemPath]
    );

    return sendSuccess(res, 201, 'Gato adicionado com sucesso', result.rows[0]);
  } catch (error) {
    console.error('Erro ao inserir gato:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* PUT - Efetivar adoção (Remove o gato do catálogo e vincula o tutor) */
router.put('/:id/adotar', verifyToken, async function(req, res) {
  try {
    const { id } = req.params;
    const { mensagem } = req.body;
    const usuarioId = req.user.id;

    if (!mensagem || !mensagem.trim()) {
      return sendError(res, 400, 'A mensagem de interesse na adoção é obrigatória.');
    }

    const gatoResult = await pool.query('SELECT * FROM gatos WHERE id = $1', [id]);
    if (gatoResult.rows.length === 0) {
      return sendError(res, 404, 'Gato não encontrado');
    }

    const gato = gatoResult.rows[0];
    if (!gato.adocao) {
      return sendError(res, 400, 'Este gato não está disponível para adoção.');
    }

    // Se houver imagem física salva, você pode apagá-la opcionalmente aqui, 
    // ou apenas deletar o registro do banco para ele sumir da listagem:
    if (gato.imagem) {
      const caminhoFisico = path.join(__dirname, '../public', gato.imagem);
      if (fs.existsSync(caminhoFisico)) {
        fs.unlinkSync(caminhoFisico);
      }
    }

    // Deleta o gato da tabela definitivamente
    await pool.query('DELETE FROM gatos WHERE id = $1', [id]);

    return sendSuccess(res, 200, 'Adoção realizada com sucesso!', gato);
  } catch (error) {
    console.error('Erro ao processar adoção:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* PUT - Editar gato (Apenas Admin) com suporte a nova imagem opcional */
router.put('/:id', verifyToken, isAdmin, upload.single('imagem'), async function(req, res) {
  try {
    const { id } = req.params;
    const { nome, idade, raca, castracao, personalidade, adocao, tutor } = req.body;

    const gatoResult = await pool.query('SELECT * FROM gatos WHERE id = $1', [id]);
    if (gatoResult.rows.length === 0) return sendError(res, 404, 'Gato não encontrado');

    const atual = gatoResult.rows[0];

    const finalNome = (nome !== undefined) ? nome.trim() : atual.nome;
    const finalIdade = (idade !== undefined) ? parseInt(idade) : atual.idade;
    const finalRaca = (raca !== undefined) ? raca.trim() : atual.raca;
    
    const finalCastracao = (castracao !== undefined) ? (castracao === 'true' || castracao === true) : atual.castracao;
    const finalPersonalidade = (personalidade !== undefined) ? personalidade.trim() : atual.personalidade;
    const finalAdocao = (adocao !== undefined) ? (adocao === 'true' || adocao === true) : atual.adocao;
    
    const finalTutor = (tutor && tutor !== "") ? parseInt(tutor) : null;
    const finalImagem = req.file ? `/static/images/gatos/${req.file.filename}` : atual.imagem;

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
router.delete('/:id', verifyToken, isAdmin, async function(req, res) {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    if (!motivo) return sendError(res, 400, 'É necessário informar o motivo da exclusão.');

    const gatoResult = await pool.query('SELECT id, imagem FROM gatos WHERE id = $1', [id]);
    if (gatoResult.rows.length === 0) return sendError(res, 404, 'Gato não encontrado');

    const gato = gatoResult.rows[0];

    if (gato.imagem) {
      const caminhoFisico = path.join(__dirname, '../public', gato.imagem);
      if (fs.existsSync(caminhoFisico)) {
        fs.unlinkSync(caminhoFisico);
      }
    }
    await pool.query('DELETE FROM gatos WHERE id = $1', [id]);
    console.log(`[AUDITORIA] Gato ID ${id} deletado. Motivo: ${motivo}`);

    return sendSuccess(res, 200, `Gato removido com sucesso (${motivo}).`);
  } catch (error) {
    console.error('Erro ao deletar gato:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});



module.exports = router;