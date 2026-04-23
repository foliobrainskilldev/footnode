const express = require('express');
const axios = require('axios');
const { authenticateToken, isAdmin } = require('./authMiddleware');
const { getPrediction } = require('./pythonService');
const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
    try {
        const matches = await req.prisma.match.findMany({
            include: { predictions: true, odds: { orderBy: { timestamp: 'desc' }, take: 1 } },
            orderBy: { date: 'asc' }
        });
        res.status(200).json(matches);
    } catch (error) {
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

router.post('/sync', isAdmin, async (req, res) => {
    try {
        const response = await axios.get('https://v3.football.api-sports.io/fixtures', {
            headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY },
            params: { date: new Date().toISOString().split('T')[0] }
        });

        const fixtures = response.data.response;
        
        for (const fixture of fixtures) {
            const matchData = {
                id: fixture.fixture.id.toString(),
                homeTeam: fixture.teams.home.name,
                awayTeam: fixture.teams.away.name,
                date: new Date(fixture.fixture.date),
                status: fixture.fixture.status.short
            };

            await req.prisma.match.upsert({
                where: { id: matchData.id },
                update: matchData,
                create: matchData
            });

            const pyMatchData = {
                home_team: matchData.homeTeam,
                away_team: matchData.awayTeam,
                home_xg: 1.5, 
                away_xg: 1.1,
                home_form: 0.8,
                away_form: 0.5,
                h2h_home_wins: 3,
                h2h_away_wins: 1
            };

            try {
                const prediction = await getPrediction(pyMatchData);
                await req.prisma.prediction.create({
                    data: {
                        matchId: matchData.id,
                        probHome: prediction.prob_home,
                        probDraw: prediction.prob_draw,
                        probAway: prediction.prob_away,
                        probOver25: prediction.prob_over_25,
                        probUnder25: prediction.prob_under_25
                    }
                });
            } catch (err) {
                console.error(`Prediction failed for match ${matchData.id}`, err);
            }
        }

        res.status(200).json({ success: true, processed: fixtures.length });
    } catch (error) {
        res.status(500).json({ error: 'EXTERNAL_API_ERROR' });
    }
});

router.get('/value-bets', async (req, res) => {
    const threshold = parseFloat(req.query.threshold) || 0.05;

    try {
        const matches = await req.prisma.match.findMany({
            where: { status: 'NS' },
            include: {
                predictions: { orderBy: { createdAt: 'desc' }, take: 1 },
                odds: { orderBy: { timestamp: 'desc' }, take: 1 }
            }
        });

        const valueBets = [];

        for (const match of matches) {
            if (match.predictions.length > 0 && match.odds.length > 0) {
                const pred = match.predictions[0];
                const odd = match.odds[0];

                const impliedHome = 1 / odd.oddHome;
                const impliedDraw = 1 / odd.oddDraw;
                const impliedAway = 1 / odd.oddAway;

                if (pred.probHome - impliedHome > threshold) {
                    valueBets.push({ matchId: match.id, market: 'HOME', odd: odd.oddHome, prob: pred.probHome, edge: pred.probHome - impliedHome });
                }
                if (pred.probDraw - impliedDraw > threshold) {
                    valueBets.push({ matchId: match.id, market: 'DRAW', odd: odd.oddDraw, prob: pred.probDraw, edge: pred.probDraw - impliedDraw });
                }
                if (pred.probAway - impliedAway > threshold) {
                    valueBets.push({ matchId: match.id, market: 'AWAY', odd: odd.oddAway, prob: pred.probAway, edge: pred.probAway - impliedAway });
                }
            }
        }

        res.status(200).json(valueBets);
    } catch (error) {
        res.status(500).json({ error: 'SERVER_ERROR' });
    }
});

module.exports = router;