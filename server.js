// server.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { body, validationResult, query } = require('express-validator');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// --- DB helpers ---
async function ensureDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    const initial = { products: [], newsletter: [], contacts: [], carts: {} };
    await fs.writeFile(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
}

async function readDb() {
  const raw = await fs.readFile(DB_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeDb(db) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// --- Middleware ---
app.use(helmet()); // Security headers
app.use(cors()); // Cross-Origin Resource Sharing
app.use(express.json({ limit: '10kb' })); // Body parser with size limit
app.use(morgan('tiny')); // Request logging

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // Limit each IP to 60 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

app.use(express.static(path.join(__dirname, 'public')));

// --- Async handler wrapper ---
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// --- Routes ---

/** * GET /api/products
 * Fetch products with optional filtering
 */
app.get('/api/products', [
  query('category').optional().isString(),
  query('size').optional().isString(),
  query('color').optional().isString(),
  query('occasion').optional().isString(),
  query('maxPrice').optional().isInt({ min: 0 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = await readDb();
  let products = db.products || [];

  const { category, size, color, occasion, maxPrice } = req.query;
  
  if (category && category !== 'all') products = products.filter(p => p.category?.toLowerCase() === category.toLowerCase());
  if (size && size !== 'all') products = products.filter(p => p.size?.toLowerCase() === size.toLowerCase());
  if (color && color !== 'all') products = products.filter(p => p.color?.toLowerCase() === color.toLowerCase());
  if (occasion && occasion !== 'all') products = products.filter(p => p.occasion?.toLowerCase() === occasion.toLowerCase());
  if (maxPrice) products = products.filter(p => Number(p.price) <= Number(maxPrice));

  res.json({ success: true, products });
}));

/** * POST /api/cart
 * Save or update a shopping cart
 */
app.post('/api/cart', [
  body('cartId').optional().isString(),
  body('items').isArray()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = await readDb();
  const cartId = req.body.cartId || randomUUID();
  
  db.carts[cartId] = { 
    items: req.body.items, 
    updatedAt: new Date().toISOString() 
  };
  
  await writeDb(db);
  res.json({ success: true, cartId, cart: db.carts[cartId] });
}));

/** * POST /api/newsletter
 * Subscribe to the newsletter
 */
app.post('/api/newsletter', [
  body('email').isEmail().normalizeEmail()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, message: 'Invalid email' });

  const db = await readDb();
  if (!db.newsletter.includes(req.body.email)) {
    db.newsletter.push(req.body.email);
    await writeDb(db);
  }
  
  res.json({ success: true, message: 'Subscribed successfully' });
}));

/** * POST /api/contact
 * Handle contact form submissions
 */
app.post('/api/contact', [
  body('name').trim().notEmpty(),
  body('email').isEmail(),
  body('message').trim().isLength({ min: 10 })
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  const db = await readDb();
  const submission = { 
    id: randomUUID(), 
    ...req.body, 
    createdAt: new Date().toISOString() 
  };
  
  db.contacts.push(submission);
  await writeDb(db);
  
  res.json({ success: true, message: 'Message sent' });
}));

// --- Error middleware ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

// --- Start server ---
async function startServer() {
  try {
    await ensureDb();
    app.listen(PORT, () => {
      console.log(`\x1b[32m%s\x1b[0m`, `[Server] Backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();