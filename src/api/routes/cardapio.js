var express = require('express');
var router = express.Router();
const pool = require('../db/config');
const { verifyToken, isAdmin } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração do armazenamento do Multer apontando para o frontend
const uploadDir = path.join(__dirname, '../../frontend-app/static/images');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Gera um nome único para a imagem não sobrescrever outra com o mesmo nome
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos!'), false);
    }
  }
});

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

/* GET - Buscar todos os itens do cardápio */
router.get('/', async function(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, nome, preco, categoria, resumo, descricao, imagem FROM cardapio ORDER BY id'
    );
    return sendSuccess(res, 200, null, result.rows);
  } catch (error) {
    console.error('Erro ao buscar itens do cardápio:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* GET - Buscar itens por filtro de nome ou categoria */
router.get('/busca/:filtro', async function(req, res) {
  try {
    const { filtro } = req.params;
    const queryText = `
      SELECT id, nome, preco, categoria, resumo, descricao, imagem 
      FROM cardapio 
      WHERE nome ILIKE $1 OR categoria ILIKE $1 
      ORDER BY id
    `;
    const result = await pool.query(queryText, ['%' + filtro + '%']);
    return sendSuccess(res, 200, null, result.rows);
  } catch (error) {
    console.error('Erro ao pesquisar no cardápio:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* GET parametrizado - Buscar item por ID */
router.get('/:id', async function(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, nome, preco, categoria, resumo, descricao, imagem FROM cardapio WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Item não encontrado no cardápio');
    }

    return sendSuccess(res, 200, null, result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar item do cardápio:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* POST - Adicionar novo item ao cardápio com Upload de Imagem (Apenas Admin) */
router.post('/', verifyToken, isAdmin, upload.single('imagem'), async function(req, res) {
  try {
    const { nome, preco, categoria, resumo, descricao } = req.body;
    
    // Caminho relativo para o SvelteKit servir a imagem a partir de /images/
    const imagemPath = req.file ? `/images/${req.file.filename}` : null;

    const errors = [];
    if (!nome || !nome.trim()) errors.push({ field: 'nome', message: 'O nome é obrigatório.', code: 'REQUIRED' });
    if (preco === undefined || preco === null || isNaN(preco) || Number(preco) < 0) {
      errors.push({ field: 'preco', message: 'Preço deve ser um valor válido e não negativo.', code: 'INVALID' });
    }
    if (!categoria || !categoria.trim()) errors.push({ field: 'categoria', message: 'A categoria é obrigatória.', code: 'REQUIRED' });
    if (!resumo || !resumo.trim()) errors.push({ field: 'resumo', message: 'O resumo é obrigatório.', code: 'REQUIRED' });
    if (!descricao || !descricao.trim()) errors.push({ field: 'descricao', message: 'A descrição é obrigatória.', code: 'REQUIRED' });

    if (errors.length > 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return sendError(res, 400, 'Preencha todos os campos obrigatórios corretamente.', errors);
    }

    const existingName = await pool.query('SELECT id FROM cardapio WHERE nome = $1', [nome.trim()]);
    if (existingName.rows.length > 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return sendError(res, 409, 'Já existe um item cadastrado com este nome.', [
        { field: 'nome', message: 'Nome já em uso.', code: 'CONFLICT' }
      ]);
    }

    const query = `
      INSERT INTO cardapio (nome, preco, categoria, resumo, descricao, imagem)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nome, preco, categoria, resumo, descricao, imagem
    `;
    const params = [
      nome.trim(),
      preco,
      categoria.trim(),
      resumo.trim(),
      descricao.trim(),
      imagemPath
    ];

    const result = await pool.query(query, params);
    return sendSuccess(res, 201, 'Item adicionado ao cardápio com sucesso', result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar item no cardápio:', error);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* PUT - Atualizar item do cardápio com Upload opcional de Imagem (Apenas Admin) */
router.put('/:id', verifyToken, isAdmin, upload.single('imagem'), async function(req, res) {
  try {
    const { id } = req.params;
    const { nome, preco, categoria, resumo, descricao } = req.body;

    const checkItem = await pool.query('SELECT * FROM cardapio WHERE id = $1', [id]);
    if (checkItem.rows.length === 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return sendError(res, 404, 'Item não encontrado no cardápio.');
    }

    const atual = checkItem.rows[0];

    const finalNome = nome !== undefined && nome !== null ? String(nome).trim() : atual.nome;
    const finalPreco = preco !== undefined && preco !== '' ? Number(preco) : atual.preco;
    const finalCategoria = categoria !== undefined && categoria !== null ? String(categoria).trim() : atual.categoria;
    const finalResumo = resumo !== undefined && resumo !== null ? String(resumo).trim() : atual.resumo;
    const finalDescricao = descricao !== undefined && descricao !== null ? String(descricao).trim() : atual.descricao;
    
    let finalImagem = atual.imagem;
    if (req.file) {
      finalImagem = `/images/${req.file.filename}`;
      // Remove a imagem antiga da pasta do frontend se ela existir
      if (atual.imagem && atual.imagem.startsWith('/images/')) {
        const filename = atual.imagem.replace('/images/', '');
        const oldPath = path.join(uploadDir, filename);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch (e) {}
        }
      }
    }

    const errors = [];
    if (!finalNome) errors.push({ field: 'nome', message: 'O nome não pode ser vazio.', code: 'REQUIRED' });
    if (isNaN(finalPreco) || Number(finalPreco) < 0) {
      errors.push({ field: 'preco', message: 'Preço deve ser um valor válido e não negativo.', code: 'INVALID' });
    }
    if (!finalCategoria) errors.push({ field: 'categoria', message: 'A categoria não pode ser vazia.', code: 'REQUIRED' });
    if (!finalResumo) errors.push({ field: 'resumo', message: 'O resumo não pode ser vazio.', code: 'REQUIRED' });
    if (!finalDescricao) errors.push({ field: 'descricao', message: 'A descrição não pode ser vazia.', code: 'REQUIRED' });

    if (errors.length > 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return sendError(res, 400, 'Verifique os dados informados.', errors);
    }

    const duplicate = await pool.query('SELECT id FROM cardapio WHERE LOWER(nome) = LOWER($1) AND id != $2', [finalNome, Number(id)]);
    if (duplicate.rows.length > 0) {
      if (req.file) fs.unlinkSync(req.file.path);
      return sendError(res, 409, 'Já existe outro item com esse nome no cardápio.', [
        { field: 'nome', message: 'Nome em uso por outro item.', code: 'CONFLICT' }
      ]);
    }

    const query = `
      UPDATE cardapio
      SET nome = $1, preco = $2, categoria = $3, resumo = $4, descricao = $5, imagem = $6
      WHERE id = $7
      RETURNING id, nome, preco, categoria, resumo, descricao, imagem
    `;
    const params = [finalNome, finalPreco, finalCategoria, finalResumo, finalDescricao, finalImagem, Number(id)];

    const result = await pool.query(query, params);
    return sendSuccess(res, 200, 'Item do cardápio atualizado com sucesso', result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar item do cardápio:', error);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* DELETE - Remover item do cardápio (Apenas Admin) */
router.delete('/:id', verifyToken, isAdmin, async function(req, res) {
  try {
    const { id } = req.params;

    const checkItem = await pool.query('SELECT id, imagem FROM cardapio WHERE id = $1', [id]);
    if (checkItem.rows.length === 0) {
      return sendError(res, 404, 'Item não encontrado no cardápio');
    }

    const item = checkItem.rows[0];

    // Remove a imagem física do frontend ao deletar o item
    if (item.imagem && item.imagem.startsWith('/images/')) {
      const filename = item.imagem.replace('/images/', '');
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    await pool.query('DELETE FROM cardapio WHERE id = $1', [id]);
    return sendSuccess(res, 200, 'Item do cardápio removido com sucesso');
  } catch (error) {
    console.error('Erro ao excluir item do cardápio:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

module.exports = router;