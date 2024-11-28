const express = require('express');
const session = require('express-session');
const axios = require('axios');
require('dotenv').config();
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up session to store tokens temporarily
app.use(session({
    name: 'twitter-auth-session',
    secret: 'your-session-secret', // Use a secure secret in production
    resave: false,
    saveUninitialized: true,
}));

// Route to initiate Twitter authentication
app.get('/auth/twitter', (req, res) => {
    const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(process.env.TWITTER_CLIENT_ID)}&redirect_uri=${encodeURIComponent(process.env.TWITTER_CALLBACK_URL)}&scope=${encodeURIComponent('tweet.read tweet.write users.read offline.access')}&state=state123&code_challenge=challenge&code_challenge_method=plain`;
    res.redirect(authUrl);
});

// Callback route where Twitter will redirect after authentication
app.get('/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        res.status(400).send('Authorization code not found.');
        return;
    }

    try {
        // Exchange the authorization code for tokens
        const response = await axios.post('https://api.twitter.com/2/oauth2/token', null, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`,
            },
            params: {
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.TWITTER_CALLBACK_URL,
                code_verifier: 'challenge',
            },
        });

        const tokens = response.data;

        // Save tokens to session
        req.session.tokenSet = tokens;

        // Save tokens to file
        fs.writeFileSync('./data/token.json', JSON.stringify(tokens, null, 2));

        // Display the tokens (including refresh token)
        res.send(`Authentication successful! Token: <pre>${JSON.stringify(tokens, null, 2)}</pre>`);
    } catch (error) {
        console.error('Failed to exchange authorization code for tokens:', error.response ? error.response.data : error.message);
        res.status(500).send('Authentication failed');
    }
});

// Route to refresh the token
app.get('/refresh', async (req, res) => {
    const refreshToken = req.session.tokenSet?.refresh_token;

    if (!refreshToken) {
        res.status(400).send('Refresh token not found. Please authenticate again.');
        return;
    }

    try {
        // Request a new access token using the refresh token
        const response = await axios.post('https://api.twitter.com/2/oauth2/token', null, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`,
            },
            params: {
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: process.env.TWITTER_CLIENT_ID,
            },
        });

        const newTokens = response.data;

        // Update tokens in the session
        req.session.tokenSet = newTokens;

        // Save new tokens to file
        fs.writeFileSync('./data/token.json', JSON.stringify(newTokens, null, 2));

        res.send(`Token refreshed! New Token: <pre>${JSON.stringify(newTokens, null, 2)}</pre>`);
    } catch (error) {
        console.error('Failed to refresh token:', error.response ? error.response.data : error.message);
        res.status(500).send('Failed to refresh token');
    }
});

// Start the Express server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Please visit http://localhost:${PORT}/auth/twitter to authenticate with Twitter.`);
});
