const jwt = require('jsonwebtoken');

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'TOKEN_REQUIRED' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await req.prisma.user.findUnique({
            where: { id: decoded.id }
        });

        if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });
        if (user.isBlocked) return res.status(403).json({ error: 'USER_BLOCKED' });

        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'INVALID_TOKEN' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'INSUFFICIENT_PERMISSIONS' });
    }
    next();
};

module.exports = { authenticateToken, isAdmin };