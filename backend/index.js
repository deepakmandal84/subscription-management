// Backend: Node.js with Express
const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
const Stripe = require('stripe');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const stripe = new Stripe('sk_test_51QeApeKQyYQHPnZvvRztUZzmCvEu7V8eLiE3lT5Y2ye64clK9j1bhxFD3JVFgpXqk2U2ndvhUGseK9kO7CpxoXtJ00gFmJFRWG'); // Replace with your Stripe secret key

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Setup
const dburl = "postgres://uel3f3niki87ji:p01a283cd1f9a847bd8d14cfb32a081af8c6052a04c86d8e5c016437d4000d47e@c5flugvup2318r.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d5923odh6fuhbr";

const sequelize = new Sequelize(dburl, {
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
const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    plan: { type: DataTypes.STRING, allowNull: false, unique: true },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
});

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    planId: { type: DataTypes.INTEGER, references: { model: SubscriptionPlan, key: 'id' } },
    startDate: { type: DataTypes.DATE, allowNull: false, defaultValue: new Date('2025-01-01') },
    paid: { type: DataTypes.BOOLEAN, defaultValue: false },
});

const PaymentDetail = sequelize.define('PaymentDetail', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, references: { model: User, key: 'id' } },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    paymentDate: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
    status: { type: DataTypes.STRING, allowNull: false },
});

// Relationships
SubscriptionPlan.hasMany(User, { foreignKey: 'planId' });
User.belongsTo(SubscriptionPlan, { foreignKey: 'planId' });
User.hasMany(PaymentDetail, { foreignKey: 'userId' });
PaymentDetail.belongsTo(User, { foreignKey: 'userId' });

// Initialize Subscription Plans
const initializePlans = async () => {
    const defaultPlans = [
        { plan: 'Daily', active: true },
        { plan: 'Monthly', active: true },
        { plan: 'Quarterly', active: true },
        { plan: 'Semi-Annually', active: true },
        { plan: 'Annually', active: true },
    ];

    for (const plan of defaultPlans) {
        await SubscriptionPlan.findOrCreate({ where: { plan: plan.plan }, defaults: plan });
    }
};



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
// Email Setup
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: "sbscrptndmn@gmail.com",
      pass: "ljkg ihxa dvkr xwle"
    }
  });

const sendPaymentReminderEmail = (user) => {
    console.log('EMAIL_USER:', process.env.EMAIL_USER);    
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS);

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Payment Reminder Notification',
        text: `Dear ${user.name},

This is a friendly reminder that your payment for the subscription plan "${user.SubscriptionPlan?.plan}" is due soon. Please ensure your payment is completed to avoid any interruptions to your services.

Best regards,
Subscription Management Team`
    };
    console.log(mailOptions);
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending reminder email:', error);
        } else {
            console.log('Reminder email sent:', info.response);
        }
    });
};

// Routes
app.get('/plans', async (req, res) => {
    try {
        const plans = await SubscriptionPlan.findAll({ where: { active: true } });
        res.status(200).json(plans);
    } catch (error) {
        console.error('Error fetching plans:', error);
        res.status(500).json({ error: 'Failed to fetch plans.' });
    }
});
/*
app.post('/users', async (req, res) => {
    try {
        const { name, email, planId, startDate } = req.body;

        if (!planId || !startDate) {
            return res.status(400).json({ error: 'Plan and Start Date are required.' });
        }

        const user = await User.create({ name, email, planId, startDate });
        res.status(201).json({ message: 'User created successfully!', user });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(400).json({ error: 'Failed to add user.' });
    }
});
*/


app.post('/users', async (req, res) => {
    try {
        const { name, email, phone, planId, startDate } = req.body;

        if (!planId || !startDate) {
            return res.status(400).json({ error: 'Plan, Start Date, and Phone Number are required.' });
        }

        const user = await User.create({ name, email, phone, planId, startDate });
        res.status(201).json({ message: 'User created successfully!', user });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(400).json({ error: 'Failed to add user.' });
    }
});



app.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({
            include: { model: SubscriptionPlan, attributes: ['plan'] },
        });
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});


app.put('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, planId, startDate } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        await user.update({ name, email, planId, startDate });
        res.status(200).json({ message: 'User updated successfully.', user });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(400).json({ error: 'Failed to update user.' });
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

app.get('/subscriptions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const subscriptions = await Subscription.findAll({ where: { userId } });
        res.status(200).json(subscriptions);
    } catch (error) {
        console.error('Error fetching subscriptions:', error);
        res.status(500).json({ error: 'Failed to fetch subscriptions.' });
    }
});

// app.post('/payments', async (req, res) => {
//     try {
//         const { email, amount, paymentDate } = req.body;
//         const user = await User.findOne({ where: { email } });
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }

//         try {
//             // Stripe Payment Intent
//             const paymentIntent = await stripe.paymentIntents.create({
//                 amount: Math.round(amount * 100), // Amount in cents
//                 currency: 'usd',
//                 description: `Payment for ${user.name}`,
//                 receipt_email: user.email
//             });

//             // Save Payment in Database
//             const payment = await PaymentDetail.create({ userId, amount, status: 'Success', paymentDate });
//             res.status(201).json({ message: 'Payment processed successfully!', payment, paymentIntent });
//         } catch (paymentError) {
//             console.error('Payment error:', paymentError);

//             // Save Failed Payment
//             await PaymentDetail.create({ userId, amount, status: 'Failed', paymentDate });

//             // Send Email Notification
//             sendPaymentFailureEmail(user, amount);

//             res.status(500).json({ error: 'Payment failed, email notification sent.' });
//         }
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// });

// Send Payment Reminders
app.post('/payments', async (req, res) => {
    try {
        const { email, amount, paymentDate } = req.body;
        const user = await User.findOne({ where: { email } });
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
            const payment = await PaymentDetail.create({ userId: user.id, amount, status: 'Success', paymentDate });
            res.status(201).json({ message: 'Payment processed successfully!', payment, paymentIntent });
        } catch (paymentError) {
            console.error('Payment error:', paymentError);

            // Save Failed Payment
            await PaymentDetail.create({ userId: user.id, amount, status: 'Failed', paymentDate });

            // Send Email Notification
            sendPaymentFailureEmail(user, amount);

            res.status(500).json({ error: 'Payment failed, email notification sent.' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/send-reminders', async (req, res) => {
    try {
        console.log(req.body.userId);
        const {userId} = req.body;
        const user = await User.findByPk(userId);
        
        sendPaymentReminderEmail(user);
        res.status(200).json({ message: 'Payment reminders sent.' });
    } catch (error) {
        console.error('Error sending reminders:', error);
        res.status(500).json({ error: 'Failed to send reminders.' });
    }
});

app.post('/send-reminder-job', async (req, res) => {
    try {
        const subscriptions = await SubscriptionPlan.findAll({
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
app.get('/paid-users', async (req, res) => {
    try {
        const paidUsers = await User.findAll({
            where: { paid: true },
            include: [
                { model: SubscriptionPlan, attributes: ['plan'] },
                { model: PaymentDetail, attributes: ['amount', 'paymentDate', 'status'] },
            ],
        });
        res.status(200).json(paidUsers);
    } catch (error) {
        console.error('Error fetching paid users:', error);
        res.status(500).json({ error: 'Failed to fetch paid users.' });
    }
});

// Sync Database and Start Server
sequelize.sync({ force: false }).then(async () => {
    await initializePlans(); // Populate subscription plans if not already
    app.listen(3000, () => {
        console.log('Server is running on http://localhost:3000');
    });
}).catch(error => console.log('Error syncing database:', error));
