const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/register', async (req, res) => {
    const { whatsapp, password } = req.body;

    if (!whatsapp || !password) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
    }

    try {
        const existingUser = await req.prisma.user.findUnique({
            where: { whatsapp }
        });

        if (existingUser) {
            return res.status(409).json({ error: 'USER_ALREADY_EXISTS' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const isFirstUser = await req.prisma.user.count() === 0;
        const role = isFirstUser ? 'ADMIN' : 'USER';

        const user = await req.prisma.user.create({
            data: { whatsapp, passwordHash, role }
        });

        res.status(201).json({ id: user.id, role: user.role });
    } catch (error) {
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

router.post('/login', async (req, res) => {
    const { whatsapp, password } = req.body;

    try {
        const user = await req.prisma.user.findUnique({
            where: { whatsapp }
        });

        if (!user) {
            return res.status(404).json({ error: 'USER_NOT_FOUND' });
        }

        if (user.isBlocked) {
            return res.status(403).json({ error: 'USER_BLOCKED' });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({ token, role: user.role });
    } catch (error) {
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

module.exports = router;