const fetch = require('node-fetch');
require('dotenv').config({ path: './.env' });

async function testDirections() {
    const REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY; // Kakao API key

    const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=127.11015314141542,37.39472714688412&destination=127.10824367964793,37.401937080111644`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `KakaoAK ${REST_API_KEY}`
            }
        });

        const data = await response.json();
        console.log(JSON.stringify(data, null, 2).slice(0, 1000));
    } catch (err) {
        console.error(err);
    }
}

testDirections();
