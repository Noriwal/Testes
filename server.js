require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
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

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📡 n8n Webhook: ${process.env.N8N_WEBHOOK_URL || 'NÃO CONFIGURADO'}`);
});