const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const {
  PORT = 3000,
  DB_HOST = 'localhost',
  DB_PORT = 3306,
  DB_USER = 'todo_user',
  DB_PASSWORD = 'todo_pass',
  DB_NAME = 'todo_db',
} = process.env;

const app = express();
app.use(cors());
app.use(express.json());

let pool;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Espera a que MySQL esté listo y crea la tabla si no existe
async function initDb() {
  for (let i = 1; i <= 30; i++) {
    try {
      pool = mysql.createPool({
        host: DB_HOST,
        port: Number(DB_PORT),
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
      });
      await pool.query(`
        CREATE TABLE IF NOT EXISTS todos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          completed TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Conectado a MySQL');
      return;
    } catch (err) {
      console.log(`MySQL no está listo (intento ${i}/30): ${err.code || err.message}`);
      await sleep(2000);
    }
  }
  throw new Error('No se pudo conectar a MySQL');
}

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/todos', wrap(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM todos ORDER BY id DESC');
  res.json(rows.map((r) => ({ ...r, completed: !!r.completed })));
}));

app.post('/api/todos', wrap(async (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'El título es obligatorio' });
  const [result] = await pool.query('INSERT INTO todos (title) VALUES (?)', [title]);
  const [rows] = await pool.query('SELECT * FROM todos WHERE id = ?', [result.insertId]);
  res.status(201).json({ ...rows[0], completed: !!rows[0].completed });
}));

app.put('/api/todos/:id', wrap(async (req, res) => {
  const { title, completed } = req.body;
  const fields = [];
  const values = [];
  if (typeof title === 'string' && title.trim()) { fields.push('title = ?'); values.push(title.trim()); }
  if (typeof completed === 'boolean') { fields.push('completed = ?'); values.push(completed ? 1 : 0); }
  if (!fields.length) return res.status(400).json({ error: 'Nada que actualizar' });
  values.push(req.params.id);
  const [result] = await pool.query(`UPDATE todos SET ${fields.join(', ')} WHERE id = ?`, values);
  if (!result.affectedRows) return res.status(404).json({ error: 'Tarea no encontrada' });
  const [rows] = await pool.query('SELECT * FROM todos WHERE id = ?', [req.params.id]);
  res.json({ ...rows[0], completed: !!rows[0].completed });
}));

app.delete('/api/todos/:id', wrap(async (req, res) => {
  const [result] = await pool.query('DELETE FROM todos WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.status(204).end();
}));

initDb()
  .then(() => app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}`)))
  .catch((err) => { console.error(err); process.exit(1); });
