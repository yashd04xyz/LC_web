// server.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { body, validationResult, query } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory and db file exist
async function ensureDb() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      await fs.access(DB_FILE);
    } catch {
      const initial = {
        products: [],
        newsletter: [],
        contacts: [],
        carts: {}
      };
      await fs.writeFile(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Failed to ensure DB file', err);
    process.exit(1);
  }
}

async function readDb() {
  const raw = await fs.readFile(DB_FILE, 'utf8');
  return JSON.parse(raw);
}

async function writeDb(db) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

// Basic middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(morgan('tiny'));

// Rate limiter for public endpoints
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // limit each IP to 60 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Serve frontend static files if you put the built frontend in "public"
app.use(express.static(path.join(__dirname, 'public')));

// API: GET /api/products
// Supports query params: category, size, color, occasion, maxPrice
app.get('/api/products', [
  query('category').optional().isString(),
  query('size').optional().isString(),
  query('color').optional().isString(),
  query('occasion').optional().isString(),
  query('maxPrice').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const db = await readDb();
    let products = db.products || [];

    const { category, size, color, occasion, maxPrice } = req.query;
    if (category && category !== 'all') products = products.filter(p => p.category === category);
    if (size && size !== 'all') products = products.filter(p => p.size === size);
    if (color && color !== 'all') products = products.filter(p => p.color === color);
    if (occasion && occasion !== 'all') products = products.filter(p => p.occasion === occasion);
    if (maxPrice) products = products.filter(p => Number(p.price) <= Number(maxPrice));

    res.json({ success: true, products });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: GET single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const db = await readDb();
    const product = (db.products || []).find(p => String(p.id) === String(req.params.id));
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: POST /api/newsletter
app.post('/api/newsletter', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const db = await readDb();
    const { email } = req.body;
    // avoid duplicates
    if (!db.newsletter.find(n => n.email === email)) {
      db.newsletter.push({ email, subscribedAt: new Date().toISOString() });
      await writeDb(db);
    }
    res.json({ success: true, message: 'Subscribed' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// API: POST /api/contact
app.post('/api/contact', [
  body('name').trim().isLength({ min: 1 }),
  body('email').isEmail().normalizeEmail(),
  body('subject').trim().isLength({ min: 1 }),
  body('message').trim().isLength({ min: 5 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const db = await readDb();
    const { name, email, subject, message } = req.body;
    db.contacts.push({ id: Date.now(), name, email, subject, message, receivedAt: new Date().toISOString() });
    await writeDb(db);
    // In production: send email to support or create a ticket here
    res.json({ success: true, message: 'Message received' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Minimal cart endpoints (session-less, client provides cartId)
app.post('/api/cart', [
  body('cartId').optional().isString(),
  body('items').isArray()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const db = await readDb();
    const cartId = req.body.cartId || `cart_${Date.now()}`;
    db.carts[cartId] = { items: req.body.items, updatedAt: new Date().toISOString() };
    await writeDb(db);
    res.json({ success: true, cartId, cart: db.carts[cartId] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/cart/:cartId', async (req, res) => {
  try {
    const db = await readDb();
    const cart = db.carts[req.params.cartId];
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
    res.json({ success: true, cart });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin-ish endpoint to reload or seed products (for dev only)
app.post('/api/seed-products', async (req, res) => {
  try {
    const db = await readDb();
    // If products already exist, skip seeding
    if (db.products && db.products.length) {
      return res.json({ success: true, message: 'Products already seeded', count: db.products.length });
    }
    // Minimal product set matching frontend
    db.products = [
      { id: 'p1', name: 'Blush Evening Dress', category: 'dresses', size: 'M', color: 'pink', occasion: 'evening', price: 2799, img: 'images/eveningdress.jpg', desc: 'A flowing blush dress with gentle pleats and a flattering waist.' },
      { id: 'p2', name: 'Classic Black Dress', category: 'dresses', size: 'S', color: 'black', occasion: 'evening', price: 3499, img: 'images/red.jpg', desc: 'Timeless black dress with refined neckline and tailored fit.' },
      { id: 'p3', name: 'White Silk Blouse', category: 'tops', size: 'L', color: 'white', occasion: 'work', price: 1299, img: 'images/white.jpg', desc: 'Soft silk blend blouse with subtle sheen and buttoned cuffs.' },
      { id: 'p4', name: 'Lavender Peplum Top', category: 'tops', size: 'M', color: 'lavender', occasion: 'casual', price: 999, img:  'images/pink.jpg', desc: 'Playful peplum silhouette with soft stretch fabric.' },
      { id: 'p5', name: 'Gold Festive Kurta Set', category: 'ethnic', size: 'XL', color: 'gold', occasion: 'festive', price: 2999, img: 'images/or.jpg', desc: 'Minimal tote with gold accents and roomy interior.' },
      { id: 'p7', name: 'Blush Sheen Scarf', category: 'accessories', size: 'NA', color: 'pink', occasion: 'casual', price: 599, img: 'images/pink.jpg', desc: 'Lightweight scarf with soft finish and elegant drape.' }
    ];
    await writeDb(db);
    res.json({ success: true, message: 'Seeded products', count: db.products.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Fallback for SPA routing: serve index.html if exists
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  fs.access(indexPath)
    .then(() => res.sendFile(indexPath))
    .catch(() => res.status(404).json({ success: false, message: 'Not found' }));
});

// Start server after ensuring DB
ensureDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Lydia backend running on http://localhost:${PORT}`);
  });
});