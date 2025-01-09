// Backend: Node.js with Express
const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
const Stripe = require('stripe');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const stripe = new Stripe('your_stripe_secret_key');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Setup
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

// Models
const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    phone: { type: DataTypes.STRING }
});

const Subscription = sequelize.define('Subscription', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    plan: { type: DataTypes.STRING, allowNull: false },
    startDate: { type: DataTypes.DATE, allowNull: false },
    endDate: { type: DataTypes.DATE, allowNull: false },
    active: { type: DataTypes.BOOLEAN, defaultValue: true }
});

const Payment = sequelize.define('Payment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false },
    paymentDate: { type: DataTypes.DATE, allowNull: false }
});

// Define Relationships
User.hasMany(Subscription);
Subscription.belongsTo(User);
User.hasMany(Payment);
Payment.belongsTo(User);

// Email Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS  // Your email password or app password
    }
});

const sendPaymentFailureEmail = (user, amount) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Payment Failed Notification',
        text: `Dear ${user.name},

We noticed that your payment of $${amount} failed. Please update your payment information to avoid interruption to your subscription.

Best regards,
Subscription Management Team`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
};

const sendPaymentReminderEmail = (user, subscription) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Payment Reminder Notification',
        text: `Dear ${user.name},

This is a friendly reminder that your payment for the subscription plan "${subscription.plan}" is due soon. Please ensure your payment is completed to avoid any interruptions to your services.

Best regards,
Subscription Management Team`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending reminder email:', error);
        } else {
            console.log('Reminder email sent:', info.response);
        }
    });
};

// Routes
app.post('/users', async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const user = await User.create({ name, email, phone });
        res.status(201).json({ message: 'User created successfully!', user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/subscriptions', async (req, res) => {
    try {
        const { userId, plan, startDate, endDate } = req.body;
        const subscription = await Subscription.create({ userId, plan, startDate, endDate });
        res.status(201).json({ message: 'Subscription created successfully!', subscription });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/payments', async (req, res) => {
    try {
        const { userId, amount, paymentDate } = req.body;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        try {
            // Stripe Payment Intent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // Amount in cents
                currency: 'usd',
                description: `Payment for ${user.name}`,
                receipt_email: user.email
            });

            // Save Payment in Database
            const payment = await Payment.create({ userId, amount, status: 'Success', paymentDate });
            res.status(201).json({ message: 'Payment processed successfully!', payment, paymentIntent });
        } catch (paymentError) {
            console.error('Payment error:', paymentError);

            // Save Failed Payment
            await Payment.create({ userId, amount, status: 'Failed', paymentDate });

            // Send Email Notification
            sendPaymentFailureEmail(user, amount);

            res.status(500).json({ error: 'Payment failed, email notification sent.' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Send Payment Reminders
app.post('/send-reminders', async (req, res) => {
    try {
        const subscriptions = await Subscription.findAll({
            where: { active: true },
            include: [User]
        });

        subscriptions.forEach((subscription) => {
            const now = new Date();
            const endDate = new Date(subscription.endDate);

            // Send reminder 3 days before the end date
            const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            if (daysLeft === 3) {
                sendPaymentReminderEmail(subscription.User, subscription);
            }
        });

        res.status(200).json({ message: 'Payment reminders sent.' });
    } catch (error) {
        console.error('Error sending reminders:', error);
        res.status(500).json({ error: 'Failed to send reminders.' });
    }
});

// Sync Database and Start Server
sequelize.sync({ force: false }).then(() => {
    app.listen(3000, () => {
        console.log('Server is running on http://localhost:3000');
    });
}).catch(error => console.log('Error syncing database:', error));
