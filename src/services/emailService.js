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
            <a href="mailto:reboot@bmsit.in" style="color: #1a237e; text-decoration: none;">reeboot@bmsit.in</a>.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #f1f1f1; padding: 20px 30px; border-top: 1px solid #e0e0e0;">
          <p style="color: #777777; font-size: 12px; margin: 0; text-align: center;">
            You are receiving this email because you registered for the ReeBooT  2025. This is an automated message; please do not reply directly to this email.
          </p>
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};


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