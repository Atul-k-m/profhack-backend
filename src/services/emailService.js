import transporter from '../config/email.js';

export const sendOTPEmail = async (email, otp, name = 'Professor') => {
  const mailOptions = {
    from: {
      name: 'ReeBooT 2025',
      address: process.env.EMAIL_USER || 'your-email@gmail.com'
    },
    to: email,
    subject: 'ReeBooT 2025 – Email Verification OTP',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <!-- Header -->
        <div style="background: #1a237e; padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
            ReeBooT 2025
          </h1>
        </div>
        
        <!-- Body -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #333333; margin-bottom: 20px;">Dear ${name},</h2>
          
          <p style="color: #555555; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Thank you for registering for the <strong>ReeBooT Faculty Hackathon 2025</strong>. As part of our verification process, please use the following One-Time Password (OTP) to confirm your email address:
          </p>
          
          <div style="background: #f1f1f1; border: 1px solid #1a237e; padding: 30px; text-align: center; margin: 30px 0;">
            <p style="color: #1a237e; font-size: 14px; font-weight: bold; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1.5px;">
              Your One-Time Password
            </p>
            <div style="font-size: 40px; font-weight: bold; color: #1a237e; letter-spacing: 6px; font-family: 'Courier New', Courier, monospace;">
              ${otp}
            </div>
          </div>
          
          <div style="background: #fff5e6; border: 1px solid #ffab00; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #665c00; font-size: 14px; margin: 0;">
              <strong>Note:</strong> This code will expire in five (5) minutes. For security reasons, please do not share this code with anyone.
            </p>
          </div>
          
          <p style="color: #555555; font-size: 14px; line-height: 1.6;">
            If you did not initiate this request or if you have any questions, please contact our support team at 
            <a href="mailto:support@reeboothack2025.org" style="color: #1a237e; text-decoration: none;">support@reeboothack2025.org</a>.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f1f1f1; padding: 20px 30px; border-top: 1px solid #e0e0e0;">
          <p style="color: #777777; font-size: 12px; margin: 0; text-align: center;">
            You are receiving this email because you registered for the ReeBooT Faculty Hackathon 2025. This is an automated message; please do not reply directly to this email.
          </p>
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};
