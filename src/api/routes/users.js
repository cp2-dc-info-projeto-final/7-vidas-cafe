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

/* GET - Buscar todos os usuários (Apenas Admin) */
router.get('/', verifyToken, isAdmin, async function(req, res) {
  try {
    const result = await pool.query('SELECT id, login, email, cpf, dat_nas, num_tel, role FROM usuario ORDER BY id');
    return sendSuccess(res, 200, null, result.rows);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* GET parametrizado - Buscar usuário autenticado */
router.get('/me', verifyToken, async function(req, res) {
  try {
    const id = req.user.id;
    const result = await pool.query('SELECT id, login, email, cpf, dat_nas, num_tel, role FROM usuario WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Usuário não encontrado');
    }

    return sendSuccess(res, 200, null, result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* GET - Buscar usuários por nome/filtra*/
router.get('/nome/:filtro', verifyToken, isAdmin, async function(req, res) {
  try {
    const { filtro } = req.params;
    const result = await pool.query('SELECT id, login, email, cpf, dat_nas, num_tel, role FROM usuario WHERE login ILIKE $1 ORDER BY id', ['%' + filtro + '%']);
    
    return sendSuccess(res, 200, null, result.rows);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* GET parametrizado - Buscar usuário por ID*/
router.get('/:id', verifyToken, isAdmin, async function(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT id, login, email, cpf, dat_nas, num_tel, role FROM usuario WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return sendError(res, 404, 'Usuário não encontrado');
    }

    return sendSuccess(res, 200, null, result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* GET ou criar automaticamente - Buscar o carrinho do usuário logado */
router.get('/carrinho', verifyToken, async function(req, res) {
  try {
    const usuarioId = req.user.id;

    // 1. Tenta buscar o carrinho existente
    let carrinhoResult = await pool.query(
      'SELECT id, usuario_id, quantidade, preco_total FROM carrinho WHERE usuario_id = $1',
      [usuarioId]
    );

    if (carrinhoResult.rows.length === 0) {
      carrinhoResult = await pool.query(
        'INSERT INTO carrinho (usuario_id, quantidade, preco_total) VALUES ($1, 0, 0.00) RETURNING id, usuario_id, quantidade, preco_total',
        [usuarioId]
      );
    }

    const carrinho = carrinhoResult.rows[0];

    const itensResult = await pool.query(`
      SELECT ic.id, ic.cardapio_id, ic.quantidade, ic.preco_unitario, ic.subtotal,
             c.nome, c.categoria, c.tamanho, c.imagem
      FROM itens_carrinho ic
      INNER JOIN cardapio c ON ic.cardapio_id = c.id
      WHERE ic.carrinho_id = $1
      ORDER BY ic.id
    `, [carrinho.id]);

    return sendSuccess(res, 200, 'Carrinho carregado com sucesso', {
      carrinho: carrinho,
      itens: itensResult.rows
    });

  } catch (error) {
    console.error('Erro ao buscar/criar carrinho:', error);
    return sendError(res, 500, 'Erro interno ao processar carrinho');
  }
});

/* POST - Criar novo usuário */
router.post('/', async function(req, res) {
  try {
    const { login, email, senha, confirmarSenha, cpf, dat_nas, num_tel, role = 'user' } = req.body;
    
    if (!login || !email || !senha || !cpf || !dat_nas || !num_tel) {
      const errors = [];
      if (!login) errors.push({ field: 'login', message: 'Login é obrigatório', code: 'REQUIRED' });
      if (!email) errors.push({ field: 'email', message: 'Email é obrigatório', code: 'REQUIRED' });
      if (!senha) errors.push({ field: 'senha', message: 'Senha é obrigatória', code: 'REQUIRED' });
      if (!cpf) errors.push({ field: 'cpf', message: 'CPF é obrigatório', code: 'REQUIRED' });
      if (!dat_nas) errors.push({ field: 'dat_nas', message: 'Data de nascimento é obrigatória', code: 'REQUIRED' });
      if (!num_tel) errors.push({ field: 'num_tel', message: 'Telefone é obrigatório', code: 'REQUIRED' });

      return sendError(res, 400, 'Todos os campos são obrigatórios', errors);
    }

    const dataSelecionada = new Date(dat_nas);
    const dataMinima = new Date('1900-01-01');
    const dataAtual = new Date();

    let idade = dataAtual.getFullYear() - dataSelecionada.getFullYear();
    const m = dataAtual.getMonth() - dataSelecionada.getMonth();

    if (m < 0 || (m === 0 && dataAtual.getDate() < dataSelecionada.getDate())) {
      idade--;
    }

    if (dataSelecionada < dataMinima) {
      return sendError(res, 400, 'Dados inválidos.', [{ field: 'dat_nas', message: 'A data não pode ser anterior a 01/01/1900.', code: 'INVALID_DATE' }]);
    }

    if (idade < 16) {
      return sendError(res, 400, 'Dados inválidos.', [{ field: 'dat_nas', message: 'Cadastro permitido apenas para maiores de 16 anos.', code: 'UNDERAGE' }]);
    }

    const existingUser = await pool.query('SELECT id FROM usuario WHERE login = $1', [login]);
    if (existingUser.rows.length > 0) {
      return sendError(res, 409, 'Login já está em uso', [{ field: 'login', message: 'Login já está em uso', code: 'CONFLICT' }]);
    }

    const existingEmail = await pool.query('SELECT id FROM usuario WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
      return sendError(res, 409, 'Email já está em uso', [{ field: 'email', message: 'Email já está em uso', code: 'CONFLICT' }]);
    }

    const existingCpf = await pool.query('SELECT id FROM usuario WHERE cpf = $1', [cpf]);
    if (existingCpf.rows.length > 0) {
      return sendError(res, 409, 'CPF já está em uso', [{ field: 'cpf', message: 'CPF já está em uso', code: 'CONFLICT' }]);
    }

    const existingTele = await pool.query('SELECT id FROM usuario WHERE num_tel = $1', [num_tel]);
    if (existingTele.rows.length > 0) {
      return sendError(res, 409, 'Telefone já está em uso', [{ field: 'num_tel', message: 'Telefone já está em uso', code: 'CONFLICT' }]);
    }

    if (senha !== confirmarSenha) {
      return sendError(res, 400, 'As senhas não coincidem', [{ field: 'confirmarSenha', message: 'As senhas não coincidem', code: 'MISMATCH' }]);
    }
 
    const hashedPassword = await bcrypt.hash(senha, 12);

    const result = await pool.query(
      'INSERT INTO usuario (login, email, senha, cpf, dat_nas, num_tel, role) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, login, email, cpf, dat_nas, num_tel, role',
      [login, email, hashedPassword, cpf, dat_nas, num_tel, role]
    );

    return sendSuccess(res, 201, 'Usuário criado com sucesso', result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    if (error.code === '23514') {
      return sendError(res, 400, 'Dados inválidos. Verifique os campos e tente novamente.');
    }
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* POST - Autenticar usuário */
router.post('/login', async function(req, res) {
  try {
    const { login, password } = req.body;

  
    const result = await pool.query(`
      SELECT id, login, email, senha, role
      FROM usuario 
      WHERE login = $1 OR email = $1
    `, [login]);

    if (result.rows.length === 0) {
      return sendError(res, 401, 'Credenciais inválidas');
    }

    const user = result.rows[0];

    bcrypt.compare(password, user.senha, (err, isMatch) => {
      if (err) {
        console.error('Erro no bcrypt:', err);
        return sendError(res, 500, 'Erro interno do servidor');
      }
      
      if (!isMatch) {
        return sendError(res, 401, 'Credenciais inválidas');
      }
      
      const token = jwt.sign(
        { 
          id: user.id, 
          login: user.login,
          email: user.email,
          role: user.role 
        }, 
        process.env.JWT_SECRET,
        { expiresIn: '1h' } 
      );

      return sendSuccess(res, 200, 'Autenticado com sucesso!', { token });
    });
  } catch (error) {
    console.error('Erro ao autenticar usuário:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* PUT - Atualizar usuário (Ajustado para permitir que o dono altere CPF e Data de Nascimento) */
router.put('/:id', verifyToken, async function(req, res) {
  try {
    const { id } = req.params;
    const { login, email, password, senha, cpf, dat_nas, num_tel, role } = req.body;

    // Aceita tanto req.body.password quanto req.body.senha (visto que o front envia como password)
    const novaSenha = password || senha;

    const isOwner = req.user.id == id;
    const isAdminUser = req.user.role === 'admin';

    if (!isAdminUser && !isOwner) {
      return sendError(res, 403, 'Você não tem permissão para alterar este usuário');
    }

    const userResult = await pool.query(
      'SELECT id, login, email, cpf, dat_nas, num_tel, role FROM usuario WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return sendError(res, 404, 'Usuário não encontrado');
    }

    const atual = userResult.rows[0];

    const finalLogin = (login !== undefined) ? login.trim() : atual.login;
    const finalEmail = (email !== undefined) ? email.trim() : atual.email;
    const finalNumTel = (num_tel !== undefined) ? num_tel.trim() : atual.num_tel;
    
    // Agora usuários comuns/donos também alteram CPF e Nascimento
    const finalCpf = (cpf !== undefined) ? cpf.trim() : atual.cpf;
    const finalDatNas = (dat_nas !== undefined) ? dat_nas : atual.dat_nas;
    
    // Apenas Administradores podem promover cargos/roles
    let finalRole = atual.role;
    if (isAdminUser) {
      finalRole = (role !== undefined) ? role : atual.role;
    }

    const errors = [];

    if (!finalLogin) {
      errors.push({ field: 'login', message: 'Nome de usuário não pode ficar vazio.', code: 'REQUIRED' });
    } else if (finalLogin.length < 3) {
      errors.push({ field: 'login', message: 'O nome de usuário deve conter pelo menos 3 caracteres.', code: 'INVALID_LENGTH' });
    }

    if (!finalEmail) {
      errors.push({ field: 'email', message: 'O campo de e-mail é obrigatório.', code: 'REQUIRED' });
    } else {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail|hotmail|outlook|yahoo|icloud|live)\.(com|com\.br)$/i;
      if (!emailRegex.test(finalEmail)) {
        errors.push({ field: 'email', message: 'Insira um e-mail válido (Ex: nome@gmail.com, nome@outlook.com).', code: 'INVALID_FORMAT' });
      }
    }

    if (!finalCpf) {
      errors.push({ field: 'cpf', message: 'O CPF é obrigatório.', code: 'REQUIRED' });
    } else {
      const cpfRegex = /^(\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11})$/;
      if (!cpfRegex.test(finalCpf)) {
        errors.push({ field: 'cpf', message: 'Formato de CPF inválido. Use Puro (12345678900) ou Formatado (123.456.789-00).', code: 'INVALID_FORMAT' });
      }
    }

    if (!finalDatNas) {
      errors.push({ field: 'dat_nas', message: 'A data de nascimento é obrigatória.', code: 'REQUIRED' });
    } else {
      const dataSelecionada = new Date(finalDatNas);
      const dataMinima = new Date('1900-01-01');
      const dataAtual = new Date();
      let idade = dataAtual.getFullYear() - dataSelecionada.getFullYear();
      const m = dataAtual.getMonth() - dataSelecionada.getMonth();
      if (m < 0 || (m === 0 && dataAtual.getDate() < dataSelecionada.getDate())) {
        idade--;
      }

      if (dataSelecionada < dataMinima) {
        errors.push({ field: 'dat_nas', message: 'A data não pode ser anterior a 01/01/1900.', code: 'INVALID_DATE' });
      } else if (idade < 16) {
        errors.push({ field: 'dat_nas', message: 'Permitido apenas para maiores de 16 anos.', code: 'UNDERAGE' });
      }
    }

    if (!finalNumTel) {
      errors.push({ field: 'num_tel', message: 'O telefone é obrigatório.', code: 'REQUIRED' });
    } else {
      const telRegex = /^\((1[1-9]|[2-9][1-9])\)(9[2-9]\d{3}|[2-5]\d{3})-\d{4}$/;
      if (!telRegex.test(finalNumTel)) {
        const digitos = finalNumTel.replace(/\D/g, '');
        if (digitos.length < 10 || digitos.length > 11) {
          errors.push({ field: 'num_tel', message: 'Deve ter 10 dígitos (fixo) ou 11 dígitos (celular) com DDD.', code: 'INVALID_LENGTH' });
        } else if (digitos.length === 11 && digitos[2] !== '9') {
          errors.push({ field: 'num_tel', message: 'Celular deve começar com 9 após o DDD. Ex: (21)9XXXX-XXXX', code: 'INVALID_FORMAT' });
        } else {
          errors.push({ field: 'num_tel', message: 'Formato incorreto. Use o padrão: (21)92345-6789.', code: 'INVALID_FORMAT' });
        }
      }
    }

    if (novaSenha !== undefined && novaSenha.trim() !== '') {
      if (novaSenha.length < 6) {
        errors.push({ field: 'senha', message: 'A nova senha deve ter pelo menos 6 caracteres.', code: 'INVALID_LENGTH' });
      }
    }

    if (errors.length > 0) {
      return sendError(res, 400, 'Verifique os dados informados.', errors);
    }

    const existingUser = await pool.query('SELECT id FROM usuario WHERE login = $1 AND id != $2', [finalLogin, id]);
    if (existingUser.rows.length > 0) {
      errors.push({ field: 'login', message: 'Este nome de usuário já está em uso.', code: 'CONFLICT' });
    }

    const existingEmail = await pool.query('SELECT id FROM usuario WHERE email = $1 AND id != $2', [finalEmail, id]);
    if (existingEmail.rows.length > 0) {
      errors.push({ field: 'email', message: 'Este e-mail já está em uso.', code: 'CONFLICT' });
    }

    const existingTele = await pool.query('SELECT id FROM usuario WHERE num_tel = $1 AND id != $2', [finalNumTel, id]);
    if (existingTele.rows.length > 0) {
      errors.push({ field: 'num_tel', message: 'Este telefone já está em uso.', code: 'CONFLICT' });
    }

    const existingCpf = await pool.query('SELECT id FROM usuario WHERE cpf = $1 AND id != $2', [finalCpf, id]);
    if (existingCpf.rows.length > 0) {
      errors.push({ field: 'cpf', message: 'Este CPF já está em uso.', code: 'CONFLICT' });
    }

    if (errors.length > 0) {
      return sendError(res, 409, 'Conflito de dados existentes.', errors);
    }

    let query;
    let params;

    if (novaSenha && novaSenha.trim() !== '') {
      const hashedPassword = await bcrypt.hash(novaSenha, 12);
      query = `
        UPDATE usuario
        SET login = $1, email = $2, senha = $3, cpf = $4, dat_nas = $5, num_tel = $6, role = $7
        WHERE id = $8
        RETURNING id, login, email, cpf, dat_nas, num_tel, role`;
      params = [finalLogin, finalEmail, hashedPassword, finalCpf, finalDatNas, finalNumTel, finalRole, id];
    } else {
      query = `
        UPDATE usuario 
        SET login = $1, email = $2, cpf = $3, dat_nas = $4, num_tel = $5, role = $6 
        WHERE id = $7 
        RETURNING id, login, email, cpf, dat_nas, num_tel, role`;
      params = [finalLogin, finalEmail, finalCpf, finalDatNas, finalNumTel, finalRole, id];
    }

    const result = await pool.query(query, params);
    return sendSuccess(res, 200, 'Usuário atualizado com sucesso', result.rows[0]);

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});

/* DELETE - Deletar usuário com confirmação de senha */
router.delete('/:id', verifyToken, async function(req, res) {
  try {
    const { id } = req.params;
    const { password } = req.body; 

    const isOwner = String(req.user.id) === String(id);
    const isAdminUser = req.user.role === 'admin';

    if (!isAdminUser && !isOwner) {
      return sendError(res, 403, 'Acesso negado: privilégios insuficientes.');
    }

    if (isAdminUser && isOwner) {
      return sendError(res, 400, 'Admins não podem excluir sua própria conta por aqui');
    }

    const userResult = await pool.query('SELECT id, senha FROM usuario WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return sendError(res, 404, 'Usuário não encontrado');
    }

    if (isOwner) {
      if (!password) {
        return sendError(res, 400, 'A senha é obrigatória para confirmar a exclusão');
      }

      const userDb = userResult.rows[0];
      const isMatch = await bcrypt.compare(password, userDb.senha);
      
      if (!isMatch) {
        return sendError(res, 401, 'Senha incorreta. Não foi possível excluir a conta.');
      }
    }

    await pool.query('DELETE FROM usuario WHERE id = $1', [id]);
    return sendSuccess(res, 200, 'Usuário deletado com sucesso');
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});




module.exports = router;