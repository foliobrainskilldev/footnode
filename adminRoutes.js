const express = require('express');
const { authenticateToken, isAdmin } = require('./authMiddleware');
const { requestNewPairingCode } = require('./whatsappAuth');
const router = express.Router();

router.use(authenticateToken);
router.use(isAdmin);

router.get('/users', async (req, res) => {
    try {
        const users = await req.prisma.user.findMany({
            select: { id: true, whatsapp: true, role: true, isBlocked: true, createdAt: true }
        });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

router.patch('/users/:id/block', async (req, res) => {
    const { id } = req.params;
    const { block } = req.body;

    try {
        const user = await req.prisma.user.update({
            where: { id },
            data: { isBlocked: block }
        });
        res.status(200).json({ id: user.id, isBlocked: user.isBlocked });
    } catch (error) {
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

router.post('/whatsapp/pair', async (req, res) => {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
        return res.status(400).json({ error: 'PHONE_NUMBER_REQUIRED' });
    }

    try {
        const code = await requestNewPairingCode(phoneNumber);
        res.status(200).json({ code });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;