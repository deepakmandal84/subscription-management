// Import necessary modules
import express from 'express';
import bodyParser from 'body-parser';
import { Sequelize, DataTypes } from 'sequelize';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();

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
const Subscription = sequelize.define('Subscription', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    plan: { 
        type: DataTypes.ENUM('Monthly', 'Quarterly', 'SemiAnnually'),
        allowNull: false 
    },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    startDate: { type: DataTypes.DATE, allowNull: false },
    endDate: { type: DataTypes.DATE, allowNull: false },
});

const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    phone: { type: DataTypes.STRING },
    subscriptionId: {
        type: DataTypes.INTEGER,
        references: {
            model: Subscription,
            key: 'id'
        }
    }
});

// Relationships
Subscription.hasMany(User, { foreignKey: 'subscriptionId' });
User.belongsTo(Subscription, { foreignKey: 'subscriptionId' });

// Email Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Routes

// Create a User with Subscription
app.post('/users', async (req, res) => {
    try {
        const { name, email, phone, plan, startDate } = req.body;

        if (!plan || !startDate) {
            return res.status(400).json({ error: 'Plan and Start Date are required.' });
        }

        // Calculate end date based on plan
        let endDate = new Date(startDate);
        if (plan === 'Monthly') endDate.setMonth(endDate.getMonth() + 1);
        else if (plan === 'Quarterly') endDate.setMonth(endDate.getMonth() + 3);
        else if (plan === 'SemiAnnually') endDate.setMonth(endDate.getMonth() + 6);

        // Create the Subscription
        const subscription = await Subscription.create({ plan, startDate, endDate, isActive: true });

        // Create the User
        const user = await User.create({ name, email, phone, subscriptionId: subscription.id });

        res.status(201).json({
            message: 'User and subscription created successfully!',
            user,
            subscription,
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get all Users with Subscriptions
app.get('/users', async (req, res) => {
    try {
        const users = await User.findAll({
            include: Subscription
        });
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// Update Subscription
app.put('/subscriptions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { plan, startDate, isActive } = req.body;

        const subscription = await Subscription.findByPk(id);

        if (!subscription) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        let endDate = new Date(startDate);
        if (plan === 'Monthly') endDate.setMonth(endDate.getMonth() + 1);
        else if (plan === 'Quarterly') endDate.setMonth(endDate.getMonth() + 3);
        else if (plan === 'SemiAnnually') endDate.setMonth(endDate.getMonth() + 6);

        await subscription.update({ plan, startDate, endDate, isActive });

        res.status(200).json({
            message: 'Subscription updated successfully!',
            subscription,
        });
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(400).json({ error: error.message });
    }
});

// Send Payment Reminders
app.post('/send-reminders', async (req, res) => {
    try {
        const subscriptions = await Subscription.findAll({
            where: { isActive: true },
            include: [User]
        });

        subscriptions.forEach(subscription => {
            const now = new Date();
            const endDate = new Date(subscription.endDate);

            // Send reminder 3 days before the end date
            const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
            if (daysLeft === 3) {
                subscription.Users.forEach(user => {
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
                });
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
