const axios = require('axios');

const pythonApi = axios.create({
    baseURL: process.env.PYTHON_API_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

const getPrediction = async (matchData) => {
    try {
        const response = await pythonApi.post('/api/v1/predict', matchData);
        return response.data;
    } catch (error) {
        throw new Error(`PYTHON_API_ERROR: ${error.message}`);
    }
};

const triggerTraining = async (historicalData) => {
    try {
        const response = await pythonApi.post('/api/v1/train', { data: historicalData });
        return response.data;
    } catch (error) {
        throw new Error(`PYTHON_API_ERROR: ${error.message}`);
    }
};

const runBacktest = async (historicalData) => {
    try {
        const response = await pythonApi.post('/api/v1/backtest', { data: historicalData });
        return response.data;
    } catch (error) {
        throw new Error(`PYTHON_API_ERROR: ${error.message}`);
    }
};

module.exports = {
    getPrediction,
    triggerTraining,
    runBacktest
};