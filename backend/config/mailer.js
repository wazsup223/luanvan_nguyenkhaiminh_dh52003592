// =============================================
// Mailer Configuration (Nodemailer)
// =============================================
// Sử dụng Ethereal (test mail) làm mặc định
// Để dùng SMTP thật, set biến môi trường:
//   MAIL_HOST=smtp.gmail.com
//   MAIL_PORT=587
//   MAIL_USER=your@email.com
//   MAIL_PASS=your-app-password
// =============================================

const nodemailer = require('nodemailer');

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.MAIL_HOST) {
    // SMTP thật
    transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT) || 587,
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  } else {
    // Ethereal test mail (fake send, xem tại https://ethereal.email)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧 Using Ethereal test mail account:', testAccount.user);
  }

  return transporter;
}

const senderName = process.env.MAIL_SENDER_NAME || 'FastFood KFC';
const senderEmail = process.env.MAIL_SENDER_EMAIL || 'noreply@fastfood-kfc.com';

/**
 * Gửi email hóa đơn
 * @param {string} to - Email người nhận
 * @param {string} subject - Tiêu đề
 * @param {string} html - Nội dung HTML
 * @returns {Promise<{success: boolean, messageId?: string, previewUrl?: string}>}
 */
async function sendMail({ to, subject, html }) {
  try {
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject,
      html,
    });

    const result = {
      success: true,
      messageId: info.messageId,
    };

    // Nếu dùng Ethereal, trả về preview URL
    if (!process.env.MAIL_HOST && info.messageId) {
      result.previewUrl = nodemailer.getTestMessageUrl(info);
    }

    console.log(`📧 Email sent: ${info.messageId}`);
    if (result.previewUrl) {
      console.log(`📧 Preview URL: ${result.previewUrl}`);
    }

    return result;
  } catch (error) {
    console.error('❌ Email send error:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendMail };
