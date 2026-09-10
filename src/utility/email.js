
const nodemailer = require('nodemailer')



const sendEmail = async ({ to, subject, html }) => {

    
    if(!process.env.EMAIL_USER || !process.env.EMAIL_PASS){
        throw new Error("Email_USER or EMAIL PAss is missing in env")
    }
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    })
    const mailOptions = {
        from: `"MeroRoom" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    }
    
        await transporter.sendMail(mailOptions);
        console.log("sucessfully email sent to: ", to)
}
module.exports = sendEmail


