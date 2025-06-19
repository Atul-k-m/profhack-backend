
import nodemailer from 'nodemailer';
import { 
  EMAIL_HOST, 
  EMAIL_PORT, 
  EMAIL_USER, 
  EMAIL_PASS,
  FRONTEND_URL 
} from '../utils/constants.js';

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_PORT === 465, // true for 465, false for other ports
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});
export const sendTeamCreationEmail = async (teamData) => {
  try {
    // Use your existing email configuration
    const transporter = nodemailer.createTransporter({
      // Your existing email config
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const membersList = teamData.members.map(member => 
      `• ${member.name} (${member.department})`
    ).join('\n');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Team Created Successfully! 🎉</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #2c3e50; margin-top: 0;">Team: ${teamData.teamName}</h3>
          <p style="color: #666;">${teamData.description}</p>
        </div>

        <div style="margin: 20px 0;">
          <h4 style="color: #333;">Team Leader:</h4>
          <p style="margin: 5px 0;">👑 ${teamData.leader.name} (${teamData.leader.department})</p>
        </div>

        <div style="margin: 20px 0;">
          <h4 style="color: #333;">Team Members:</h4>
          <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; color: #333; font-family: Arial, sans-serif;">${membersList}</pre>
        </div>

        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #2d5a2d;"><strong>Next Steps:</strong></p>
          <ul style="color: #2d5a2d; margin: 10px 0;">
            <li>All team members will receive this notification</li>
            <li>You can view your team details in the Teams section</li>
            <li>Start collaborating on your projects!</li>
          </ul>
        </div>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          This is an automated message from the Team Management System
        </p>
      </div>
    `;

    // Send to all team members including leader
    const allEmails = [teamData.leader.email, ...teamData.members.map(m => m.email)];
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@teammanagement.com',
      to: allEmails,
      subject: `Team "${teamData.teamName}" Created Successfully`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log('Team creation emails sent successfully');
  } catch (error) {
    console.error('Error sending team creation email:', error);
    // Don't throw error - team creation should succeed even if email fails
  }
};
export const sendOTPEmail = async (email, otp, name = 'User') => {
  const mailOptions = {
    from: `"Your App" <${EMAIL_USER}>`,
    to: email,
    subject: 'Email Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Email Verification</h2>
        <p>Hello ${name},</p>
        <p>Your email verification OTP is:</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This OTP will expire in 5 minutes.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
        <p>Best regards,<br>Your App Team</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

export const sendPasswordResetEmail = async (email, resetToken, name = 'User') => {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const mailOptions = {
    from: `"Your App" <${EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        <p>Best regards,<br>Your App Team</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};