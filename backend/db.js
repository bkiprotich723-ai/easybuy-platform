const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function initDB() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT,
                email TEXT UNIQUE,
                password TEXT,
                role TEXT DEFAULT 'buyer',
                referral_code TEXT,
                referred_by TEXT,
                profile_picture TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                seller_id INTEGER,
                name TEXT,
                description TEXT,
                price NUMERIC,
                image TEXT,
                stock INTEGER DEFAULT 0,
                category TEXT DEFAULT 'general',
                specifications TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                buyer_id INTEGER,
                product_id INTEGER,
                amount NUMERIC,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS wallets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER UNIQUE,
                balance NUMERIC DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                type TEXT,
                amount NUMERIC,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS withdrawals (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                amount NUMERIC,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS seller_earnings (
                id SERIAL PRIMARY KEY,
                seller_id INTEGER,
                order_id INTEGER,
                amount NUMERIC,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Safe migrations for existing databases
        await client.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;
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
