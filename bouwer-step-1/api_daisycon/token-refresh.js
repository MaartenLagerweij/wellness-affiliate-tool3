const fs = require('fs');
require('dotenv').config({ path: '../.env' });

console.log(process.env.DAISYCON_CLIENT_ID)

async function refreshToken(refresh_token) {
    const url = 'https://login.daisycon.com/oauth/access-token';
    const data = {
        grant_type: 'refresh_token',
        refresh_token: refresh_token, // Vul hier de ontvangen refresh token in
        client_id: process.env.DAISYCON_CLIENT_ID,
        client_secret: '',
        redirect_uri: 'https://login.daisycon.com/oauth/cli'
    };
    console.log('data: ', data);
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        const responseData = await response.json();
        console.log('responseData: ',responseData)

        fs.writeFileSync('./tokens.json', JSON.stringify(responseData));

    } catch (e) {
        console.error(e);
    }
}
module.exports = refreshToken;