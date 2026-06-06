const pool = require("../db");

// CREATE USER
const createUser = async (name, email, password, role, referral_code, referred_by) => {
    const sql = `
        INSERT INTO users (name, email, password, role, referral_code, referred_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
    `;
    const result = await pool.query(sql, [name, email, password, role, referral_code, referred_by]);
    return result.rows[0].id;
};

// FIND USER
const findUserByEmail = async (email) => {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
    return result.rows[0]; // undefined if not found
};

module.exports = {
    createUser,
    findUserByEmail
};