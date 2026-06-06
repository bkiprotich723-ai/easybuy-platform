const { Pool } = require("pg");

// Use DATABASE_URL from environment (Render / Neon / Supabase all provide this)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Render + Neon/Supabase
    }
});

// Create all tables on startup
async function initDB() {
    const client = await pool.connect();
    try {
        await client.query(`
            -- USERS
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT,
                email TEXT UNIQUE,
                password TEXT,
                role TEXT DEFAULT 'buyer',
                referral_code TEXT,
                referred_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- PRODUCTS
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                seller_id INTEGER,
                name TEXT,
                description TEXT,
                price NUMERIC,
                image TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- ORDERS
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                buyer_id INTEGER,
                product_id INTEGER,
                amount NUMERIC,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- WALLETS
            CREATE TABLE IF NOT EXISTS wallets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE,
                balance NUMERIC DEFAULT 0
            );

            -- WALLET TRANSACTIONS
            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                type TEXT,
                amount NUMERIC,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- WITHDRAWALS
            CREATE TABLE IF NOT EXISTS withdrawals (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                amount NUMERIC,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- SELLER EARNINGS
            CREATE TABLE IF NOT EXISTS seller_earnings (
                id SERIAL PRIMARY KEY,
                seller_id INTEGER,
                order_id INTEGER,
                amount NUMERIC,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ Database tables ready (PostgreSQL)");
    } catch (err) {
        console.error("❌ Database init error:", err.message);
        throw err;
    } finally {
        client.release();
    }
}

initDB();

module.exports = pool;
