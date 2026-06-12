var express = require('express');
var router = express.Router();
const pool = require('../db/config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { verifyToken, isAdmin } = require('../middlewares/auth');

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

/* GET - Buscar usuários por nome/filtra (Apenas Admin) */
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

/* GET parametrizado - Buscar usuário por ID (Apenas Admin) */
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
      WHERE login = $1
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

/* PUT - Atualizar usuário */
router.put('/:id', verifyToken, async function(req, res) {
  try {
    const { id } = req.params;
    const { login, email, senha, cpf, dat_nas, num_tel, role } = req.body;

    const isOwner = req.user.id == id;
    const isAdminUser = req.user.role === 'admin';

    // Apenas admin ou dono da conta
    if (!isAdminUser && !isOwner) {
      return sendError(
        res,
        403,
        'Você não tem permissão para alterar este usuário'
      );
    }

    // Busca usuário atual
    const userResult = await pool.query(
      `SELECT
        id,
        login,
        email,
        cpf,
        dat_nas,
        num_tel,
        role
      FROM usuario
      WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return sendError(res, 404, 'Usuário não encontrado');
    }

    const atual = userResult.rows[0];

    // Mantém valores atuais caso não venham no body
    const finalLogin = login ?? atual.login;
    const finalEmail = email ?? atual.email;
    const finalNumTel = num_tel ?? atual.num_tel;

    let finalCpf = atual.cpf;
    let finalDatNas = atual.dat_nas;
    let finalRole = atual.role;

    // Apenas admin pode alterar esses campos
    if (isAdminUser) {
      finalCpf = cpf ?? atual.cpf;
      finalDatNas = dat_nas ?? atual.dat_nas;
      finalRole = role ?? atual.role;
    }

    // Login
    const existingUser = await pool.query(
      'SELECT id FROM usuario WHERE login = $1 AND id != $2',
      [finalLogin, id]
    );

    if (existingUser.rows.length > 0) {
      return sendError(res, 409, 'Login já está em uso', [
        { field: 'login', message: 'Login já está em uso', code: 'CONFLICT'}
      ]);
    }

    // Email
    const existingEmail = await pool.query(
      'SELECT id FROM usuario WHERE email = $1 AND id != $2',
      [finalEmail, id]
    );

    if (existingEmail.rows.length > 0) {
      return sendError(res, 409, 'Email já está em uso', [
        {
          field: 'email', message: 'Email já está em uso', code: 'CONFLICT'}
      ]);
    }

    // Telefone
    const existingTele = await pool.query(
      'SELECT id FROM usuario WHERE num_tel = $1 AND id != $2',
      [finalNumTel, id]
    );

    if (existingTele.rows.length > 0) {
      return sendError(res, 409, 'Telefone já está em uso', [
        { field: 'num_tel', message: 'Telefone já está em uso', code: 'CONFLICT'}
         ]
      );
    }

    // CPF somente para admin
    if (isAdminUser) {
      const existingCpf = await pool.query(
        'SELECT id FROM usuario WHERE cpf = $1 AND id != $2', [finalCpf, id]);

      if (existingCpf.rows.length > 0) {
        return sendError(res, 409, 'CPF já está em uso', [
          {field: 'cpf', message: 'CPF já está em uso', code: 'CONFLICT'}
        ]
      );
    }
  }

    let query;
    let params;

    if (senha && senha.trim() !== '') {
      const hashedPassword = await bcrypt.hash(senha, 12);

      query = `
        UPDATE usuario
        SET login = $1,email = $2,senha = $3,cpf = $4, dat_nas = $5,num_tel = $6, role = $7
        WHERE id = $8
        RETURNING id, login, email, cpf, dat_nas, num_tel, role`;

      params = [ finalLogin, finalEmail, hashedPassword, finalCpf, finalDatNas, finalNumTel, finalRole, id ];} 
      else {
      query = ` UPDATE usuario SET login = $1, email = $2, cpf = $3, dat_nas = $4, num_tel = $5, role = $6 WHERE id = $7 
        RETURNING id, login, email, cpf, dat_nas, num_tel, role`;

      params = [ finalLogin, finalEmail, finalCpf, finalDatNas, finalNumTel, finalRole, id];
    }

    const result = await pool.query(query, params);

    return sendSuccess(
      res,
      200,
      'Usuário atualizado com sucesso',
      result.rows[0]
    );

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);

    if (error.code === '23514') {
      return sendError(
        res,
        400,
        'Dados inválidos. Verifique os campos e tente novamente.'
      );
    }

    return sendError(res, 500, 'Erro interno do servidor');
  }
});


/* DELETE - Deletar usuário com confirmação de senha */
/* DELETE - Deletar usuário com confirmação de senha (SEM isAdmin na assinatura) */
router.delete('/:id', verifyToken, async function(req, res) {
  try {
    const { id } = req.params;
    const { password } = req.body; 

    // Garante comparação de string idêntica (evita erros de int vs string)
    const isOwner = String(req.user.id) === String(id);
    const isAdminUser = req.user.role === 'admin';

    // 1. Permissão básica (Se não for admin e nem o dono da conta, barra)
    if (!isAdminUser && !isOwner) {
      return sendError(res, 403, 'Acesso negado: privilégios insuficientes.');
    }

    // 2. Bloqueia admin de se excluir por aqui de propósito
    if (isAdminUser && isOwner) {
      return sendError(res, 400, 'Admins não podem excluir sua própria conta por aqui');
    }

    // 3. Busca o usuário no banco para pegar o hash da senha
    const userResult = await pool.query('SELECT id, senha FROM usuario WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return sendError(res, 404, 'Usuário não encontrado');
    }

    // 4. Se for o DONO deletando a conta, ele precisa passar a senha
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

    // 5. Deleta o usuário do banco
    await pool.query('DELETE FROM usuario WHERE id = $1', [id]);
    return sendSuccess(res, 200, 'Usuário deletado com sucesso');
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    return sendError(res, 500, 'Erro interno do servidor');
  }
});
module.exports = router;