import transporter from '../config/email.js';


export const sendOTPEmail = async (email, otp, name = 'User') => {
  const mailOptions = {
    from: {
      name: 'ProfHack 2025',
      address: process.env.EMAIL_USER || 'your-email@gmail.com'
    },
    to: email,
    subject: 'Email Verification - Your OTP Code',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #000000; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Email Verification</h1>
        </div>
        
        <div style="padding: 40px 30px;">
          <h2 style="color: #333333; margin-bottom: 20px;">Hello ${name},</h2>
          
          <p style="color: #666666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Thank you for registering! Please use the following OTP code to verify your email address:
          </p>
          
          <div style="background: #f8f9fa; border: 2px solid #000000; padding: 30px; text-align: center; margin: 30px 0;">
            <p style="color: #000000; font-size: 14px; font-weight: bold; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 2px;">
              Your OTP Code
            </p>
            <div style="font-size: 42px; font-weight: bold; color: #000000; letter-spacing: 8px; font-family: 'Courier New', monospace;">
              ${otp}
            </div>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #856404; font-size: 14px; margin: 0;">
              ⚠️ <strong>Important:</strong> This code will expire in 5 minutes. Do not share this code with anyone.
            </p>
          </div>
          
          <p style="color: #666666; font-size: 14px; line-height: 1.6;">
            If you didn't request this verification, please ignore this email or contact our support team.
          </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e9ecef;">
          <p style="color: #6c757d; font-size: 12px; margin: 0; text-align: center;">
            This is an automated message from ProfHack 2025. Please do not reply to this email.
          </p>
        </div>
      </div>
    `
  };
  
  return transporter.sendMail(mailOptions);
};