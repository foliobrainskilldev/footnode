const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const matchRoutes = require('./matchRoutes');

const prisma = new PrismaClient();
const app = express();

app.use(helmet());
app.use(express.json());

const corsOptions = {
    origin: process.env.CORS_ORIGIN === '*' ? '*' : process.env.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

app.use((req, res, next) => {
    req.prisma = prisma;
    next();
});

app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/matches', matchRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Node Server running on port ${PORT}`);
});