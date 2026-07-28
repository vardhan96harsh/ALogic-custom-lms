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

    res.status(200).json({
      success: true,
      requests,
    });
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
    const {
      name,
      phone,
      email,
      organization,
      designation,
      employeeCount,
      date,
      time,
      message,
    } = req.body;

    console.log("Demo request body:", req.body);

    if (
      !name ||
      !email ||
      !organization ||
      !designation ||
      !employeeCount ||
      !date ||
      !time
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const savedRequest = await DemoRequest.create({
      name,
      phone: phone || "",
      email,
      organization,
      designation,
      employeeCount,
      date,
      time,
      message: message || "",
    });

    const mailOptions = {
      from: `"Alogic LMS Website" <${process.env.EMAIL_USER}>`,
      replyTo: email,
      to: process.env.ADMIN_EMAIL,
      subject: "New LMS Demo Request from Website",
      html: `
        <div style="font-family:Arial,sans-serif;background:#f4f8fb;padding:24px;">
          <div style="max-width:650px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">

            <div style="background:#1e90e8;padding:18px 24px;color:#ffffff;">
              <h2 style="margin:0;font-size:22px;">New LMS Demo Request</h2>
              <p style="margin:6px 0 0;font-size:14px;">
                Corporate Training Platform by Alogic Data
              </p>
            </div>

            <div style="padding:24px;">
              <p style="font-size:15px;color:#374151;margin-bottom:20px;">
                A new user has requested an LMS demo.
              </p>

              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:12px;background:#f9fafb;font-weight:bold;width:35%;">
                    Name
                  </td>
                  <td style="padding:12px;">${name}</td>
                </tr>

                <tr>
                  <td style="padding:12px;background:#f9fafb;font-weight:bold;">
                    Phone
                  </td>
                  <td style="padding:12px;">${phone || "N/A"}</td>
                </tr>

                <tr>
                  <td style="padding:12px;background:#f9fafb;font-weight:bold;">
                    Email
                  </td>
                  <td style="padding:12px;">${email}</td>
                </tr>

                <tr>
                  <td style="padding:12px;background:#f9fafb;font-weight:bold;">
                    Organization
                  </td>
                  <td style="padding:12px;">${organization}</td>
                </tr>

                <tr>
                  <td style="padding:12px;background:#f9fafb;font-weight:bold;">
                    Designation
                  </td>
                  <td style="padding:12px;">${designation}</td>
                </tr>

                <tr>
                  <td style="padding:12px;background:#f9fafb;font-weight:bold;">
                    Employee Count
                  </td>
                  <td style="padding:12px;">${employeeCount}</td>
                </tr>

                <tr>
                  <td style="padding:12px;background:#f9fafb;font-weight:bold;">
                    Meeting Date
                  </td>
                  <td style="padding:12px;">${date}</td>
                </tr>

                <tr>
                  <td style="padding:12px;background:#f9fafb;font-weight:bold;">
                    Meeting Time
                  </td>
                  <td style="padding:12px;">${time}</td>
                </tr>

                <tr>
                  <td style="padding:12px;background:#f9fafb;font-weight:bold;">
                    Message
                  </td>
                  <td style="padding:12px;">${message || "N/A"}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(201).json({
      success: true,
      message: "Demo request sent successfully",
      request: savedRequest,
    });
  } catch (error) {
    console.error("Demo request error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send demo request",
      error: error.message,
    });
  }
};