require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const db = require('./database');

const app = express();
// app.use(cors());
app.use(cors({
  origin: ['https://testes-bxae.onrender.com']
}));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// ============================
// HELPERS
// ============================

function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  return name.charAt(0) + '***' + '@' + domain;
}

function maskCPF(cpf) {
  if (!cpf || cpf.length < 11) return cpf;
  return '***.***.***-' + cpf.slice(-2);
}

function maskPhone(phone) {
  if (!phone || phone.length < 8) return phone;
  return '(**)* ****-' + phone.slice(-4);
}

async function triggerN8n(eventName, data) {
  if (!process.env.N8N_WEBHOOK_URL) return;
  try {
    await fetch(process.env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        timestamp: new Date().toISOString(),
        data: data
      })
    });
    console.log(`✅ n8n: ${eventName}`);
  } catch (e) {
    console.log('⚠️ n8n offline:', e.message);
  }
}

function logAccess(userId, action, req) {
  db.run(
    'INSERT INTO access_logs (user_id, action, ip, user_agent) VALUES (?, ?, ?, ?)',
    [userId, action, req.ip, req.headers['user-agent']]
  );
}

// ============================
// MIDDLEWARES
// ============================

function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userName = decoded.name;
    next();
  } catch {
    return res.status(403).json({ error: 'Token inválido' });
  }
}

// ============================
// AUTH
// ============================

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, cpf, phone, consent_lgpd } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  }
  if (!consent_lgpd) {
    return res.status(400).json({ error: 'Consentimento LGPD é obrigatório' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    db.run(
      `INSERT INTO users (name, email, password, cpf, phone, consent_lgpd, consent_date, is_verified) 
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 1)`,
      [name, email, hashedPassword, cpf || null, phone || null, 1],
      async function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'E-mail já cadastrado' });
          }
          return res.status(500).json({ error: 'Erro ao criar usuário' });
        }
        
        const userId = this.lastID;
        logAccess(userId, 'REGISTER', req);
        
        // Dispara n8n
        await triggerN8n('user_registered', {
          userId: userId,
          name: name,
          email: email,
          cpf: cpf || null,
          phone: phone || null
        });

        res.status(201).json({ 
          message: 'Usuário criado com sucesso',
          userId: userId
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL', [email], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Credenciais inválidas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    logAccess(user.id, 'LOGIN', req);
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_verified: user.is_verified
      }
    });
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  db.get(
    'SELECT id, name, email, cpf, phone, birth_date, is_verified, created_at FROM users WHERE id = ?',
    [req.userId],
    (err, user) => {
      if (err || !user) return res.status(404).json({ error: 'Usuário não encontrado' });
      logAccess(user.id, 'VIEW_PROFILE', req);
      res.json({
        id: user.id,
        name: user.name,
        email: maskEmail(user.email),
        emailRaw: user.email,
        cpf: maskCPF(user.cpf),
        phone: maskPhone(user.phone),
        is_verified: user.is_verified,
        created_at: user.created_at
      });
    }
  );
});

// ============================
// LGPD
// ============================

app.get('/api/lgpd/export', authMiddleware, (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Usuário não encontrado' });

    db.all('SELECT * FROM posts WHERE user_id = ?', [req.userId], (err, posts) => {
      db.all('SELECT * FROM orders WHERE user_id = ?', [req.userId], (err, orders) => {
        logAccess(req.userId, 'DATA_EXPORT', req);
        res.json({
          personal_data: {
            name: user.name,
            email: user.email,
            cpf: user.cpf,
            phone: user.phone,
            created_at: user.created_at
          },
          posts,
          orders,
          exported_at: new Date().toISOString()
        });
      });
    });
  });
});

app.delete('/api/lgpd/delete-account', authMiddleware, (req, res) => {
  const { password } = req.body;

  db.get('SELECT * FROM users WHERE id = ?', [req.userId], async (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Senha incorreta' });

    db.run('UPDATE posts SET user_id = NULL, title = "[Anônimo] " || title WHERE user_id = ?', [req.userId]);
    db.run('UPDATE orders SET user_id = NULL WHERE user_id = ?', [req.userId]);

    db.run(
      `UPDATE users SET 
        name = '[EXCLUÍDO]', 
        email = 'deleted_' || id || '@anonimo.com', 
        password = 'deleted', 
        cpf = NULL, 
        phone = NULL, 
        birth_date = NULL, 
        deleted_at = datetime('now') 
      WHERE id = ?`,
      [req.userId],
      function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao excluir conta' });
        logAccess(req.userId, 'ACCOUNT_DELETION', req);
        res.json({ message: 'Conta excluída. Dados anonimizados.' });
      }
    );
  });
});

// ============================
// FÓRUM
// ============================

app.get('/api/forum/posts', (req, res) => {
  db.all(
    `SELECT p.*, COALESCE(u.name, 'Anônimo') as author_name 
     FROM posts p 
     LEFT JOIN users u ON p.user_id = u.id 
     ORDER BY p.created_at DESC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar posts' });
      res.json(rows);
    }
  );
});

app.post('/api/forum/posts', authMiddleware, (req, res) => {
  const { title, content } = req.body;
  
  if (!title || !content) {
    return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
  }

  db.run(
    'INSERT INTO posts (user_id, title, content) VALUES (?, ?, ?)',
    [req.userId, title, content],
    async function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao criar post' });
      
      await triggerN8n('new_forum_post', {
        postId: this.lastID,
        userId: req.userId,
        userName: req.userName,
        title: title
      });

      logAccess(req.userId, 'CREATE_POST', req);
      res.status(201).json({ message: 'Post criado', postId: this.lastID });
    }
  );
});

// ============================
// LOJA
// ============================

app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro ao buscar produtos' });
    res.json(rows);
  });
});

app.get('/api/products/:id', (req, res) => {
  db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(row);
  });
});

app.post('/api/orders', authMiddleware, (req, res) => {
  const { product_id, quantity, address } = req.body;

  db.get('SELECT * FROM products WHERE id = ?', [product_id], async (err, product) => {
    if (err || !product) return res.status(404).json({ error: 'Produto não encontrado' });

    const qtd = quantity || 1;
    const total = product.price * qtd;

    if (product.type === 'physical') {
      if (!address) return res.status(400).json({ error: 'Endereço obrigatório para produtos físicos' });
      if (product.stock < qtd) return res.status(400).json({ error: 'Estoque insuficiente' });
      db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [qtd, product_id]);
    }

    db.run(
      'INSERT INTO orders (user_id, product_id, quantity, total, address) VALUES (?, ?, ?, ?, ?)',
      [req.userId, product_id, qtd, total, address || null],
      async function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao criar pedido' });
        
        const orderId = this.lastID;
        logAccess(req.userId, 'CREATE_ORDER', req);
        
        await triggerN8n('new_order', {
          orderId: orderId,
          userId: req.userId,
          userEmail: req.userEmail,
          userName: req.userName,
          productName: product.name,
          productType: product.type,
          total: total,
          address: address || null
        });

        res.status(201).json({
          message: 'Pedido criado',
          orderId: orderId,
          total,
          status: 'pending'
        });
      }
    );
  });
});

app.get('/api/orders/my', authMiddleware, (req, res) => {
  db.all(
    `SELECT o.*, p.name as product_name, p.type as product_type 
     FROM orders o 
     JOIN products p ON o.product_id = p.id 
     WHERE o.user_id = ? 
     ORDER BY o.created_at DESC`,
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar pedidos' });
      res.json(rows);
    }
  );
});

// ============================
// ADMIN
// ============================

app.get('/api/admin/users', (req, res) => {
  db.all('SELECT id, name, email, is_verified, created_at FROM users WHERE deleted_at IS NULL', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Erro' });
    res.json(rows);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================
// START
// ============================

// Gerar token de reset e avisar n8n enviar e-mail
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório' });

  db.get('SELECT id, name, email FROM users WHERE email = ? AND deleted_at IS NULL', [email], async (err, user) => {
    if (err || !user) {
      // Retorna sucesso mesmo se não existir (segurança: não revelar e-mails)
      return res.json({ message: 'Se o e-mail existir, enviaremos instruções.' });
    }

    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hora

    db.run(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expires.toISOString()],
      async function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao gerar token' });

        // Dispara n8n para enviar e-mail
        await triggerN8n('password_reset_request', {
          userId: user.id,
          name: user.name,
          email: user.email,
          resetToken: token,
          resetLink: `https://testes-bxae.onrender.com/reset-password.html?token=${token}`
        });

        res.json({ message: 'Se o e-mail existir, enviaremos instruções.' });
      }
    );
  });
});

// Resetar senha com token
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Token e senha (mín. 6 chars) obrigatórios' });
  }

  db.get(
    'SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime("now")',
    [token],
    async (err, reset) => {
      if (err || !reset) return res.status(400).json({ error: 'Token inválido ou expirado' });

      const hashed = await bcrypt.hash(newPassword, 12);

      db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, reset.user_id], function(err) {
        if (err) return res.status(500).json({ error: 'Erro ao atualizar senha' });

        db.run('UPDATE password_resets SET used = 1 WHERE id = ?', [reset.id]);
        res.json({ message: 'Senha alterada com sucesso! Faça login.' });
      });
    }
  );
});

// Listar comentários de um post (com respostas aninhadas)
app.get('/api/forum/posts/:id/comments', (req, res) => {
  const postId = req.params.id;
  
  db.all(
    `SELECT c.*, u.name as author_name 
     FROM comments c 
     LEFT JOIN users u ON c.user_id = u.id 
     WHERE c.post_id = ? 
     ORDER BY c.created_at ASC`,
    [postId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro ao buscar comentários' });
      
      // Organiza em árvore (comentários principais + respostas)
      const map = {};
      const roots = [];
      rows.forEach(c => {
        c.replies = [];
        map[c.id] = c;
        if (c.parent_id) {
          if (map[c.parent_id]) map[c.parent_id].replies.push(c);
        } else {
          roots.push(c);
        }
      });
      res.json(roots);
    }
  );
});

// Criar comentário ou resposta
app.post('/api/forum/posts/:id/comments', authMiddleware, (req, res) => {
  const postId = req.params.id;
  const { content, parent_id } = req.body;

  if (!content) return res.status(400).json({ error: 'Conteúdo obrigatório' });

  db.run(
    'INSERT INTO comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)',
    [postId, req.userId, parent_id || null, content],
    async function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao comentar' });
      
      await triggerN8n('new_comment', {
        commentId: this.lastID,
        postId: postId,
        userId: req.userId,
        userName: req.userName,
        isReply: !!parent_id
      });

      res.status(201).json({ message: 'Comentário adicionado', commentId: this.lastID });
    }
  );
});

// Listar avaliações de um produto
app.get('/api/products/:id/reviews', (req, res) => {
  db.all(
    `SELECT r.*, u.name as author_name 
     FROM reviews r 
     LEFT JOIN users u ON r.user_id = u.id 
     WHERE r.product_id = ? 
     ORDER BY r.created_at DESC`,
    [req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro' });
      res.json(rows);
    }
  );
});

// Média de avaliações
app.get('/api/products/:id/rating', (req, res) => {
  db.get(
    'SELECT AVG(rating) as avg, COUNT(*) as total FROM reviews WHERE product_id = ?',
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Erro' });
      res.json({ average: Math.round(row.avg || 0), total: row.total });
    }
  );
});

// Criar avaliação (só quem comprou pode avaliar - simplificado: qualquer logado)
app.post('/api/products/:id/reviews', authMiddleware, (req, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.id;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Nota de 1 a 5 obrigatória' });
  }

  db.run(
    'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)',
    [productId, req.userId, rating, comment || null],
    function(err) {
      if (err) return res.status(500).json({ error: 'Erro ao avaliar' });
      res.status(201).json({ message: 'Avaliação enviada' });
    }
  );
});

// Meu carrinho
app.get('/api/cart', authMiddleware, (req, res) => {
  db.all(
    `SELECT c.*, p.name, p.price, p.type, p.stock 
     FROM cart c 
     JOIN products p ON c.product_id = p.id 
     WHERE c.user_id = ?`,
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro' });
      const total = rows.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      res.json({ items: rows, total });
    }
  );
});

// Adicionar ao carrinho
app.post('/api/cart', authMiddleware, (req, res) => {
  const { product_id, quantity } = req.body;
  const qtd = quantity || 1;

  db.get('SELECT stock FROM products WHERE id = ?', [product_id], (err, product) => {
    if (err || !product) return res.status(404).json({ error: 'Produto não encontrado' });

    // Verifica se já existe no carrinho
    db.get('SELECT * FROM cart WHERE user_id = ? AND product_id = ?', [req.userId, product_id], (err, existing) => {
      if (existing) {
        const newQtd = existing.quantity + qtd;
        db.run('UPDATE cart SET quantity = ? WHERE id = ?', [newQtd, existing.id], function(err) {
          if (err) return res.status(500).json({ error: 'Erro' });
          res.json({ message: 'Quantidade atualizada' });
        });
      } else {
        db.run(
          'INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)',
          [req.userId, product_id, qtd],
          function(err) {
            if (err) return res.status(500).json({ error: 'Erro' });
            res.status(201).json({ message: 'Adicionado ao carrinho' });
          }
        );
      }
    });
  });
});

// Remover do carrinho
app.delete('/api/cart/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM cart WHERE id = ? AND user_id = ?', [req.params.id, req.userId], function(err) {
    if (err) return res.status(500).json({ error: 'Erro' });
    res.json({ message: 'Removido' });
  });
});

// Esvaziar carrinho
app.delete('/api/cart', authMiddleware, (req, res) => {
  db.run('DELETE FROM cart WHERE user_id = ?', [req.userId], function(err) {
    if (err) return res.status(500).json({ error: 'Erro' });
    res.json({ message: 'Carrinho esvaziado' });
  });
});

// Listar meus endereços
app.get('/api/addresses', authMiddleware, (req, res) => {
  db.all(
    'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
    [req.userId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erro' });
      res.json(rows);
    }
  );
});

// Criar endereço
app.post('/api/addresses', authMiddleware, (req, res) => {
  const { street, number, complement, city, state, zip, country, is_default } = req.body;
  
  if (!street || !city || !state) {
    return res.status(400).json({ error: 'Rua, cidade e estado são obrigatórios' });
  }

  db.run(
    `INSERT INTO addresses (user_id, street, number, complement, city, state, zip, country, is_default) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.userId, street, number || null, complement || null, city, state, zip || null, country || 'Brasil', is_default ? 1 : 0],
    async function(err) {
      if (err) return res.status(500).json({ error: 'Erro' });
      
      if (is_default) {
        db.run('UPDATE addresses SET is_default = 0 WHERE user_id = ? AND id != ?', [req.userId, this.lastID]);
      }
      
      res.status(201).json({ message: 'Endereço salvo', addressId: this.lastID });
    }
  );
});

// Definir como padrão
app.put('/api/addresses/:id/default', authMiddleware, (req, res) => {
  db.run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [req.userId], function(err) {
    db.run('UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.userId], function(err) {
      if (err) return res.status(500).json({ error: 'Erro' });
      res.json({ message: 'Endereço padrão atualizado' });
    });
  });
});

// Deletar endereço
app.delete('/api/addresses/:id', authMiddleware, (req, res) => {
  db.run('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.userId], function(err) {
    if (err) return res.status(500).json({ error: 'Erro' });
    res.json({ message: 'Endereço removido' });
  });
});

// Checkout do carrinho
app.post('/api/orders/checkout', authMiddleware, (req, res) => {
  const { address_id } = req.body;

  db.all(
    `SELECT c.*, p.* FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?`,
    [req.userId],
    async (err, items) => {
      if (err || items.length === 0) return res.status(400).json({ error: 'Carrinho vazio' });

      let total = 0;
      let hasPhysical = false;
      let addressToUse = null;

      // Verifica estoque e calcula total
      for (let item of items) {
        if (item.type === 'physical') {
          hasPhysical = true;
          if (item.stock < item.quantity) {
            return res.status(400).json({ error: `Estoque insuficiente: ${item.name}` });
          }
        }
        total += item.price * item.quantity;
      }

      // Se tem produto físico, precisa de endereço
      if (hasPhysical) {
        if (!address_id) return res.status(400).json({ error: 'Selecione um endereço de entrega' });
        
        const addr = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [address_id, req.userId], (err, row) => {
            if (err || !row) resolve(null);
            else resolve(row);
          });
        });
        
        if (!addr) return res.status(400).json({ error: 'Endereço inválido' });
        addressToUse = `${addr.street}, ${addr.number || 'S/N'}${addr.complement ? ' - ' + addr.complement : ''}, ${addr.city}/${addr.state}, ${addr.zip}`;
      }

      // Cria pedidos para cada item
      const orderIds = [];
      for (let item of items) {
        if (item.type === 'physical') {
          db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.id]);
        }
        
        const result = await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO orders (user_id, product_id, quantity, total, address) VALUES (?, ?, ?, ?, ?)',
            [req.userId, item.id, item.quantity, item.price * item.quantity, addressToUse],
            function(err) {
              if (err) reject(err);
              else resolve(this.lastID);
            }
          );
        });
        orderIds.push(result);
      }

      // Limpa carrinho
      db.run('DELETE FROM cart WHERE user_id = ?', [req.userId]);

      await triggerN8n('new_order', {
        userId: req.userId,
        userEmail: req.userEmail,
        userName: req.userName,
        orderIds: orderIds,
        total: total,
        address: addressToUse
      });

      res.status(201).json({
        message: 'Pedido finalizado!',
        orders: orderIds,
        total: total
      });
    }
  );
});
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📡 n8n Webhook: ${process.env.N8N_WEBHOOK_URL || 'NÃO CONFIGURADO'}`);
});
