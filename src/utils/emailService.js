const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    // For development - use Gmail SMTP with your provided credentials
    if (process.env.NODE_ENV !== 'production') {
      return nodemailer.createTransporter({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER || 'reboot@bmsit.in',
          pass: process.env.EMAIL_PASS 
        }
      });
    }

    // For production - use your actual SMTP settings
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendTeamCreationEmail(team, allMembers) {
    try {
      const leader = allMembers.find(m => m._id.toString() === team.leader.toString());
      const members = allMembers.filter(m => m._id.toString() !== team.leader.toString());

      const membersList = allMembers.map(member => 
        `• ${member.name} (${member.department}) ${member._id.toString() === team.leader.toString() ? '- LEADER' : ''}`
      ).join('\n');

      const emailContent = {
        from: process.env.EMAIL_USER || 'reboot@bmsit.in',
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

module.exports = new EmailService();