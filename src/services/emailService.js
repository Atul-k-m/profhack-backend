// services/emailService.js - Updated with password reset functionality
import nodemailer from 'nodemailer';
import { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, FRONTEND_URL } from '../utils/constants.js';

class EmailService {
  constructor() {
    this.transporter = this.createTransport();
  }

  createTransporter() {
    return nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });
  }

  async sendOTPEmail(email, otp, name) {
    const mailOptions = {
      from: `"BMSIT Reboot" <${EMAIL_USER}>`,
      to: email,
      subject: 'Your OTP for BMSIT Reboot Registration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #000; padding-bottom: 10px;">
            Welcome to BMSIT Reboot! 🚀
          </h2>
          
          <p>Hello ${name || 'User'},</p>
          
          <p>Thank you for registering with BMSIT Reboot. Please use the following OTP to verify your email address:</p>
          
          <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; text-align: center; border-left: 4px solid #000;">
            <h1 style="margin: 0; color: #000; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          </div>

          <p><strong>Important:</strong></p>
          <ul>
            <li>This OTP is valid for 5 minutes only</li>
            <li>Do not share this OTP with anyone</li>
            <li>If you didn't request this, please ignore this email</li>
          </ul>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px; text-align: center;">
            This is an automated email from BMSIT Reboot Registration System.<br>
            Please do not reply to this email.
          </p>
        </div>
      `
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(email, resetToken, name) {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"BMSIT Reboot" <${EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request - BMSIT Reboot',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #000; padding-bottom: 10px;">
            Password Reset Request 🔒
          </h2>
          
          <p>Hello ${name || 'User'},</p>
          
          <p>We received a request to reset your password for your BMSIT Reboot account.</p>
          
          <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; text-align: center; border-left: 4px solid #000;">
            <p style="margin: 0 0 15px 0; color: #666;">Click the button below to reset your password:</p>
            <a href="${resetUrl}" style="display: inline-block; background: #000; color: white; padding: 12px 30px; text-decoration: none; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
              Reset Password
            </a>
          </div>

          <p><strong>Important:</strong></p>
          <ul>
            <li>This link is valid for 1 hour only</li>
            <li>If you didn't request this, please ignore this email</li>
            <li>Your password will remain unchanged until you create a new one</li>
          </ul>

          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666; font-size: 12px;">${resetUrl}</p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px; text-align: center;">
            This is an automated email from BMSIT Reboot System.<br>
            Please do not reply to this email.
          </p>
        </div>
      `
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendTeamCreationEmail(team, allMembers) {
    try {
      const leader = allMembers.find(m => m._id.toString() === team.leader.toString());
      const members = allMembers.filter(m => m._id.toString() !== team.leader.toString());

      const membersList = allMembers.map(member => 
        `• ${member.name} (${member.department}) ${member._id.toString() === team.leader.toString() ? '- LEADER' : ''}`
      ).join('\n');

      const emailContent = {
        from: `"BMSIT Reboot" <${EMAIL_USER}>`,
        subject: `Team "${team.teamName}" Created Successfully`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333; border-bottom: 2px solid #000; padding-bottom: 10px;">
              Team Created Successfully! 🎉
            </h2>
            
            <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #000;">
              <h3 style="margin: 0 0 10px 0; color: #000;">Team: ${team.teamName}</h3>
              <p style="margin: 0; color: #666;">${team.description || 'No description provided'}</p>
            </div>

            <h3 style="color: #333; margin-top: 30px;">Team Members:</h3>
            <div style="background: #fff; border: 1px solid #ddd; padding: 15px;">
              <pre style="font-family: Arial, sans-serif; white-space: pre-line; margin: 0;">${membersList}</pre>
            </div>

            <div style="margin-top: 30px; padding: 15px; background: #e3f2fd; border-radius: 4px;">
              <p style="margin: 0; color: #1976d2;">
                <strong>Next Steps:</strong><br>
                • Your team is now officially registered<br>
                • All members have been notified<br>
                • You can now participate in team activities
              </p>
            </div>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #888; font-size: 12px; text-align: center;">
              This is an automated notification from BMSIT Reboot Team System.<br>
              Please do not reply to this email.
            </p>
          </div>
        `
      };

      // Send to all team members
      const emailPromises = allMembers.map(member => {
        return this.transporter.sendMail({
          ...emailContent,
          to: member.email,
          subject: member._id.toString() === team.leader.toString() 
            ? `Team "${team.teamName}" Created - You are the Leader!` 
            : `You've been added to Team "${team.teamName}"`
        });
      });

      const results = await Promise.allSettled(emailPromises);
      
      // Log results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`✅ Email sent successfully to ${allMembers[index].email}`);
          console.log(`📧 Message ID: ${result.value.messageId}`);
        } else {
          console.error(`❌ Failed to send email to ${allMembers[index].email}:`, result.reason);
        }
      });

      return results;
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

  // Test email functionality
  async testEmailConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready to send emails');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

// Export functions for use in controllers
const emailService = new EmailService();

export const sendOTPEmail = (email, otp, name) => emailService.sendOTPEmail(email, otp, name);
export const sendPasswordResetEmail = (email, resetToken, name) => emailService.sendPasswordResetEmail(email, resetToken, name);
export const sendTeamCreationEmail = (team, allMembers) => emailService.sendTeamCreationEmail(team, allMembers);
export const testEmailConnection = () => emailService.testEmailConnection();

export default emailService;