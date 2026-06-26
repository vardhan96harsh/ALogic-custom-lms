
const nodemailer = require("nodemailer");
const DemoRequest = require("../models/DemoRequest");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.getDemoRequests = async (req, res) => {
  try {
    const requests = await DemoRequest.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, requests });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch demo requests",
      error: error.message,
    });
  }
};

exports.sendDemoRequest = async (req, res) => {
  try {
    const { name, email, organization, message } = req.body;

    if (!name || !email || !organization) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and organization are required",
      });
    }

      await DemoRequest.create({ name, email, organization, message });

    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: process.env.ADMIN_EMAIL,
      subject: "New Demo Request from Website",
   html: `
  <div style="font-family: Arial, sans-serif; background:#f4f8fb; padding:24px;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #e5e7eb;">
      
      <div style="background:#1e90e8; padding:18px 24px; color:#ffffff;">
        <h2 style="margin:0; font-size:22px;">New LMS Demo Request</h2>
        <p style="margin:6px 0 0; font-size:14px;">
          Corporate Training Platform by Alogic Data
        </p>
      </div>

      <div style="padding:24px;">
        <p style="font-size:15px; color:#374151; margin-bottom:20px;">
          A new user has requested an LMS demo from the website.
        </p>

        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:12px; background:#f9fafb; font-weight:bold; color:#111827; width:35%;">Name</td>
            <td style="padding:12px; color:#374151;">${name}</td>
          </tr>
          <tr>
            <td style="padding:12px; background:#f9fafb; font-weight:bold; color:#111827;">Email</td>
            <td style="padding:12px; color:#374151;">${email}</td>
          </tr>
          <tr>
            <td style="padding:12px; background:#f9fafb; font-weight:bold; color:#111827;">Organization</td>
            <td style="padding:12px; color:#374151;">${organization}</td>
          </tr>
          <tr>
            <td style="padding:12px; background:#f9fafb; font-weight:bold; color:#111827;">Message</td>
            <td style="padding:12px; color:#374151;">${message || "N/A"}</td>
          </tr>
        </table>

        <div style="margin-top:24px; padding:16px; background:#eaf5ff; border-radius:10px; color:#1f2937;">
          Please contact the user as soon as possible for the demo discussion.
        </div>
      </div>

      <div style="padding:14px 24px; background:#f9fafb; text-align:center; font-size:12px; color:#6b7280;">
        © Alogic Data | LMS Demo Request
      </div>
    </div>
  </div>
`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: "Demo request sent successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to send demo request",
      error: error.message,
    });
  }
};