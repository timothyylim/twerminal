const axios = require('axios');
const fs = require('fs');

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

// Function to post a tweet
async function postTweet(tweetText) {
    const tokenSet = readTokenFromFile();
    const accessToken = tokenSet.access_token;

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
        if (error.response) {
            console.error('Failed to post tweet:', error.response.data);
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
