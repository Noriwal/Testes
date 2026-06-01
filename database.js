const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'data.db'), (err) => {
  if (err) console.error('Erro ao abrir banco:', err);
  else console.log('✅ Banco de dados SQLite conectado');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    cpf TEXT,
    phone TEXT,
    birth_date TEXT,
    consent_lgpd INTEGER DEFAULT 0,
    consent_date TEXT,
    is_verified INTEGER DEFAULT 1,
    deleted_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    type TEXT CHECK(type IN ('digital', 'physical')) NOT NULL,
    stock INTEGER DEFAULT 0,
    file_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    product_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    total REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Produtos de exemplo
  db.get("SELECT COUNT(*) as count FROM products", (err, row) => {
    if (row.count === 0) {
      const stmt = db.prepare(`INSERT INTO products (name, description, price, type, stock, file_url) VALUES (?, ?, ?, ?, ?, ?)`);
      stmt.run("E-book Full Stack", "PDF completo de 300 páginas", 49.90, "digital", 999, "https://exemplo.com/ebook.pdf");
      stmt.run("Camiseta Dev", "Algodão premium, estampa minimalista", 79.90, "physical", 50, null);
      stmt.run("Curso API REST", "Vídeo-aulas + código fonte + certificado", 199.00, "digital", 999, "https://exemplo.com/curso.zip");
      stmt.run("Caneca Coder", "Cerâmica 325ml, térmica", 39.90, "physical", 30, null);
      stmt.finalize();
    }
  });
});

module.exports = db;