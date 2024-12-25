const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

// Function to read the token from the file
function readTokenFromFile() {
    try {
        const tokenData = fs.readFileSync('./data/token.json', 'utf8');
        return JSON.parse(tokenData);
    } catch (error) {
        console.error('Error reading token from file:', error);
        process.exit(1);
    }
}

// Function to test the validity of the token
async function testTokenValidity() {
    const tokenSet = readTokenFromFile();
    const accessToken = tokenSet.access_token;

    try {
        const response = await axios.get('https://api.twitter.com/2/users/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        console.log('Token is valid. User data:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Token validation failed:', error.response.data);
        } else {
            console.error('Error making request:', error.message);
        }
    }
}

// Function to refresh the access token
async function refreshToken() {
    try {
        const tokenData = readTokenFromFile();
        const refreshToken = tokenData.refresh_token;

        // Ensure the client ID is read correctly
        const clientId = process.env.TWITTER_CLIENT_ID;
        if (!clientId) {
            console.error('Unable to read client ID. Check your environment variables.');
            process.exit(1);
        }
        console.log('clientId', clientId);

        const params = new URLSearchParams();
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', refreshToken);
        params.append('client_id', clientId);

        const response = await axios.post('https://api.twitter.com/2/oauth2/token', params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: `Basic ${Buffer.from(`${clientId}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`,
            }
        });

        // Update the token in your storage
        fs.writeFileSync('./data/token.json', JSON.stringify(response.data));
        console.log('Token refreshed successfully.');
        return response.data.access_token;
    } catch (error) {
        console.error('Failed to refresh token:', error.response ? JSON.stringify(error.response.data) : error.message);
        process.exit(1);
    }
}

// Updated function to post a tweet with refresh logic
async function postTweet(tweetText) {
    let tokenSet = readTokenFromFile();
    let accessToken = tokenSet.access_token;

    try {
        const response = await axios.post('https://api.twitter.com/2/tweets', {
            text: tweetText
        }, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Tweet posted successfully:', response.data);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.error('Authentication failed. Attempting to refresh token...');
            accessToken = await refreshToken(); // Attempt to refresh the token

            // Retry the tweet post with the new token
            try {
                const response = await axios.post('https://api.twitter.com/2/tweets', {
                    text: tweetText
                }, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('Tweet posted successfully after refreshing token:', response.data);
            } catch (retryError) {
                console.error('Failed to post tweet after token refresh:', retryError.response ? retryError.response.data : retryError.message);
            }
        } else {
            console.error('Error making request:', error.message);
        }
    }
}

// Command line argument handling
if (process.argv.length > 2) {
    const command = process.argv[2];

    switch (command) {
        case 'test-token':
            testTokenValidity();
            break;
        case 'tweet':
            if (process.argv.length > 3) {
                const tweetText = process.argv.slice(3).join(' ');
                postTweet(tweetText);
            } else {
                console.log('Please provide text to tweet. Usage: node index.js tweet "Your tweet text here"');
            }
            break;
        default:
            console.log('Unknown command. Available commands: test-token, tweet');
            break;
    }
} else {
    console.log('No command provided. Available commands: test-token, tweet');
}
