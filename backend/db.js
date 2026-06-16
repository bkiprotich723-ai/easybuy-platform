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
                mpesa_number TEXT,
                is_verified BOOLEAN DEFAULT false,
                verification_code TEXT,
                verification_expires TIMESTAMP,
                status TEXT DEFAULT 'active',
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
                status TEXT DEFAULT 'pending',
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
            ALTER TABLE users ADD COLUMN IF NOT EXISTS mpesa_number TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires TIMESTAMP;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
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
