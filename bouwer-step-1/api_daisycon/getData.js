const fs = require('fs');
const refreshToken = require('./token-refresh');

//Need to import the access_token for making API calls
let rawTokenData = fs.readFileSync('./tokens.json');
let { access_token } = JSON.parse(rawTokenData);

//This function only runs when the current access_token is expired
async function refreshTokenFunction(){
    let { refresh_token } = JSON.parse(rawTokenData);
    await refreshToken(refresh_token);
    rawTokenData = fs.readFileSync('./tokens.json');
    ({ access_token } = JSON.parse(rawTokenData));
    ({ refresh_token } = JSON.parse(rawTokenData));
}

async function getDatafeedURL(program_id){
    
    const response = await fetch(`https://services.daisycon.com/publishers/342961/productfeeds.v2/program?program_id=${program_id}`, {
        headers: {
            "accept": "application/json",
            'Authorization': `Bearer ${access_token}`
        }
    });
    const result = await response.json();
    console.log('result: ', result)

    //If the result is that the token is expired then first refresh token. 
    //The function getDatafeedURL could be called automatically again, but to prevent possible recursion the console log is returned to call the function again manually
    if(result['error'] == 'Authenticate: Expired token') {
        console.log('refreshing token...')
        await refreshTokenFunction()
        console.log('→ run function again')
        return;
    }
    const datafeedObject = result[0];
    const url = datafeedObject.url;
    
    return url;
}


async function fetchProductData(program_id){
    let url = await getDatafeedURL(program_id);

    //Replace #MEDIA_ID# with the Media ID from WellnesscentrumNederland.nl
    const urlDatafeed = 'https:'+url.replace('#MEDIA_ID#', '244044')+'&type=JSON';

    let rawData = await fetch(urlDatafeed);
    let JSONData = await rawData.json();

    let allProducts = JSONData.datafeed.programs[0].products

    // for(let product of allProducts){
    //     console.log(`${product.product_info.title} and the affiliate link for this wellness is: 
    //     ${product.product_info.link}
        
    //     The original price was ${product.product_info.price_old} and now ${product.product_info.price}`);
    // }
    console.log(urlDatafeed)
    //return console.log(allProducts)
}

fetchProductData('11136')

module.exports = fetchProductData


// Did not find much under /publishers/material/adgroups
// With /publishers/material/ads I get the response { error: 'Invalid media id supplied, a valid media id is required when subscribed_only is set to true' }
// I can receive promotios under the API URL: publishers/342961/material/promotions. But when I filter for program_id with 11136 (SpaOnline) I get an empty array. For 7805 (VakantieDiscounter) I also get an empty array. I think these just don't have promotions.
// I think there is something that I could do with /productfeeds/search and /productfeeds/search/programs, but I'm not sure how to use this because it needs to be a POST request. I've written the getDataPOST for this in the file getDataPOST.js (this one is already deleted)


//Data for SpaOnline (program id: 11136):
    // Logo: under API route /publishers/342961/programs/11136 and then result['logo']
    // under the API /publishers/342961/material/deeplinks I can add the parameter ?subscribed_only=true&media_id=244044&program_id=11136 to the API url and I get a response, but the  response url doesn't replace the media_id, when that one is required. Not sure if this result is working
    // Also not sure how to create other deeplink url's, since this is only the homepage from SpaOnline.com
