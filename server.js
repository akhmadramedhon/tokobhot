require('dotenv').config(); 
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const db = new sqlite3.Database('./xionco.db'); 
const PORT = 3000;

const genAI = new GoogleGenerativeAI(process.env.API_KEY); 

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

//database
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, price INTEGER, category TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS stocks (product_id INTEGER, quantity INTEGER, FOREIGN KEY(product_id) REFERENCES products(id))`);
    db.run(`CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT, total_price INTEGER, status TEXT DEFAULT 'success', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, product_id INTEGER, quantity INTEGER, price_at_purchase INTEGER, FOREIGN KEY(order_id) REFERENCES orders(id), FOREIGN KEY(product_id) REFERENCES products(id))`);

    db.get("SELECT count(*) as count FROM products", (err, row) => {
        if (!err && row.count === 0) {
            console.log("Seeding Database...");
            const products = [
                ["Laptop Gaming", 15000000, "Elektronik"], ["Mouse Wireless", 150000, "Elektronik"],
                ["Laptop Kantor", 12000000, "Elektronik"], ["TV 24 inch", 1500000, "Elektronik"],
                ["Keyboard Mechanical", 500000, "Elektronik"], ["PC", 20000000, "Elektronik"],
                ["Kemeja Polo", 120000, "Fashion"], ["Celana Joging", 100000, "Fashion"],
                ["Sepatu Running", 1200000, "Fashion"], ["Kemeja Flanel", 150000, "Fashion"]
            ];
            
            db.serialize(() => {
                const stmtProd = db.prepare("INSERT INTO products (name, price, category) VALUES (?, ?, ?)");
                const stmtStock = db.prepare("INSERT INTO stocks (product_id, quantity) VALUES (?, ?)");

                products.forEach(p => {
                    stmtProd.run(p[0], p[1], p[2], function() {
                        stmtStock.run(this.lastID, 50); 
                    });
                });
            });
        }
    });
});

//route
app.get('/', (req, res) => {
    const query = `SELECT p.id, p.name, p.price, p.category, s.quantity FROM products p JOIN stocks s ON p.id = s.product_id ORDER BY p.name ASC`;
    db.all(query, (err, rows) => { res.render('index', { products: rows, page: 'home' }); });
});

app.get('/create-order', (req, res) => {
    const query = `SELECT p.id, p.name, p.price, s.quantity FROM products p JOIN stocks s ON p.id = s.product_id WHERE s.quantity > 0`;
    db.all(query, (err, rows) => { res.render('create_order', { products: rows, page: 'order' }); });
});

app.post('/checkout', (req, res) => {
    let { customer_name, product_ids, quantities } = req.body;
    if (!Array.isArray(product_ids)) { product_ids = [product_ids]; quantities = [quantities]; }

    let totalPrice = 0;
    const itemsToInsert = []; 
    const placeholders = product_ids.map(() => '?').join(',');
    
    db.all(`SELECT id, price FROM products WHERE id IN (${placeholders})`, product_ids, (err, products) => {
        const priceMap = {};
        products.forEach(p => priceMap[p.id] = p.price);

        for (let i = 0; i < product_ids.length; i++) {
            const pid = parseInt(product_ids[i]);
            const qty = parseInt(quantities[i]);
            totalPrice += (priceMap[pid] * qty);
            itemsToInsert.push({ pid, qty, price: priceMap[pid] });
        }

        db.run("INSERT INTO orders (customer_name, total_price) VALUES (?, ?)", [customer_name, totalPrice], function(err) {
            if (err) return res.send(err.message);
            const orderId = this.lastID;
            const stmtItem = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)");
            const stmtStock = db.prepare("UPDATE stocks SET quantity = quantity - ? WHERE product_id = ?");

            itemsToInsert.forEach(item => {
                stmtItem.run(orderId, item.pid, item.qty, item.price);
                stmtStock.run(item.qty, item.pid);
            });
            stmtItem.finalize();
            stmtStock.finalize();
            res.redirect('/transactions');
        });
    });
});

app.get('/transactions', (req, res) => {
    const query = `SELECT * FROM orders ORDER BY created_at DESC`;
    db.all(query, (err, rows) => { res.render('transactions', { orders: rows, page: 'transactions' }); });
});

app.get('/transaction/:id', (req, res) => {
    const orderId = req.params.id;
    const query = `SELECT oi.*, p.name FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`;
    db.all(query, [orderId], (err, rows) => { res.json(rows); });
});

app.post('/cancel-order', (req, res) => {
    const orderId = req.body.order_id;
    db.all("SELECT product_id, quantity FROM order_items WHERE order_id = ?", [orderId], (err, items) => {
        if (!err && items.length > 0) {
            const stmtRestock = db.prepare("UPDATE stocks SET quantity = quantity + ? WHERE product_id = ?");
            items.forEach(item => { stmtRestock.run(item.quantity, item.product_id); });
            stmtRestock.finalize();
        }
        db.run("UPDATE orders SET status = 'cancelled' WHERE id = ?", [orderId], () => { res.redirect('/transactions'); });
    });
});

//chatbot
app.get('/chat', (req, res) => res.render('chat', {page:'chat'}));

app.post('/api/chat', (req, res) => {
    const userMessage = req.body.message;
    
    const query = `SELECT p.name, p.category, p.price, s.quantity FROM products p JOIN stocks s ON p.id = s.product_id`;
    
    db.all(query, async (err, rows) => { 
        if (err) return res.json({ reply: "Maaf, database sedang bermasalah." });
        
        const productContext = rows.map(p => 
            `- ${p.name} (${p.category}) | Rp ${p.price.toLocaleString('id-ID')} | Stok: ${p.quantity}`
        ).join('\n');

        const prompt = `
            Bertindaklah sebagai CS 'Xionco Store'.
            Data Produk Real-time:
            ${productContext}
            
            Aturan:
            - Jawab singkat dan membantu.
            - Gunakan data di atas untuk cek stok/harga.
            - Rekomendasi ukuran sepatu: 24cm=38, 25cm=39, 26cm=41, 27cm=42.
            
            User: "${userMessage}"
        `;

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash"});
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            res.json({ reply: text });
        } catch (error) {
            console.error("Gemini Error:", error);
            res.json({ reply: "Maaf, AI sedang sibuk. Coba lagi nanti." });
        }
    });
});

app.listen(PORT, () => {
    console.log(`App berjalan di http://localhost:${PORT}`);
});