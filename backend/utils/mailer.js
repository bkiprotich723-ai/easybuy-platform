const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendPasswordResetEmail(email, resetLink) {
    await transporter.sendMail({
        from: `"EasyBuy Platform" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Reset your EasyBuy password",
        html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f1117;color:#e2e8f0;padding:32px;border-radius:12px">
                <h2 style="color:#7c6ef7;margin-bottom:8px">🛍 EasyBuy</h2>
                <h3 style="color:#e2e8f0;margin-bottom:16px">Reset your password</h3>
                <p style="color:#8892a4;margin-bottom:24px">
                    You requested a password reset. Click the button below to set a new password.
                    This link expires in <b style="color:#f7c948">1 hour</b>.
                </p>
                <a href="${resetLink}" 
                   style="display:inline-block;background:#7c6ef7;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:24px">
                    Reset Password
                </a>
                <p style="color:#5a6480;font-size:13px">
                    If you didn't request this, ignore this email — your password won't change.
                </p>
                <p style="color:#5a6480;font-size:12px;margin-top:16px">
                    Or copy this link: <a href="${resetLink}" style="color:#7c6ef7">${resetLink}</a>
                </p>
            </div>
        `
    });
}

module.exports = { sendPasswordResetEmail };