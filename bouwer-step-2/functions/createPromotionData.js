const fs = require('fs');
const axios = require('axios');

const wellnessListIDs = require(__dirname+'/../data/wellnessListIDs.js');

const campaigns = {
    spaOnline: {
        network: 'daisycon',
        url: 'https://daisycon.io/datafeed/?media_id=244044&standard_id=1&language_code=nl&locale_id=1&type=JSON&program_id=11136&html_transform=none&rawdata=false&encoding=utf8&general=false'
    },
    adWebwinkel: {
        network: 'daisycon',
        url: 'https://daisycon.io/datafeed/?media_id=244044&standard_id=16&language_code=nl&locale_id=1&type=JSON&program_id=13048&html_transform=none&rawdata=false&encoding=utf8&general=false'
    },
    fletcher: {
        network: 'daisycon',
        url: 'https://daisycon.io/datafeed/?media_id=244044&standard_id=16&language_code=nl&locale_id=1&type=JSON&program_id=13146&html_transform=none&rawdata=false&encoding=utf8&general=false'
    },
    vakantieVeilingen: {
        network: 'tradetracker',
        url: 'https://pf.tradetracker.net/?aid=228134&encoding=utf-8&type=json&fid=1185051&productFeedCategoryHash=1f337e60263d2a5b7a6c91540fa3bbf8&categoryType=2&additionalType=2'
    },
    actievandedag: {
        network: 'tradetracker',
        url: 'https://pf.tradetracker.net/?aid=228134&encoding=utf-8&type=json&fid=1261798&categoryType=2&additionalType=2'
    },
    ticketveiling: {
        network: 'tradetracker',
        url: 'https://pf.tradetracker.net/?aid=228134&encoding=utf-8&type=json&fid=1922718&categoryType=2&additionalType=2'
    },
    tripper: {
        network: 'tradetracker',
        url: 'https://pf.tradetracker.net/?aid=228134&encoding=utf-8&type=json&fid=1169772&productFeedCategoryHash=32a07c6643e39bb3fe494292db9ae233&categoryType=2&additionalType=2'
    },
    zoweg: {
        network: 'tradetracker',
        url: 'https://pf.tradetracker.net/?aid=228134&encoding=utf-8&type=json&fid=750467&categoryType=2&additionalType=2'
    },
    hotelspecials: {
        network: 'tradetracker',
        url: 'https://pf.tradetracker.net/?aid=228134&encoding=utf-8&type=json&fid=344304&categoryType=2&additionalType=2'
    },
    voordeeluitjes1: {
        network: 'tradetracker',
        url: 'https://pf.tradetracker.net/?aid=228134&encoding=utf-8&type=json&fid=1904458&categoryType=2&additionalType=2&part=1_4'
    },
    voordeeluitjes2: {
        network: 'tradetracker',
        url: 'https://pf.tradetracker.net/?aid=228134&encoding=utf-8&type=json&fid=1904458&categoryType=2&additionalType=2&part=2_4'
    },
    voordeeluitjes3: {
        network: 'tradetracker',
        url: 'https://pf.tradetracker.net/?aid=228134&encoding=utf-8&type=json&fid=1904458&categoryType=2&additionalType=2&part=3_4'
    },
    voordeeluitjes4: {
        network: 'tradetracker',
        url: 'https://pf.tradetracker.net/?aid=228134&encoding=utf-8&type=json&fid=1904458&categoryType=2&additionalType=2&part=4_4'
    }
};


const affiliateFeedURLs = {
    'daisycon': response => response.data.datafeed.programs[0].products,
    'tradetracker': response => response.data.products,
}

const promotions = [];

//Filter the promotions array to only keep ones with matching titles to the regex of the wellnessListIDs
function filterPromotions(promotionsArr){
    return promotionsArr.filter(promotion => {
        let title = promotion.name || promotion.product_info.title
        title = title.replace(/[\s,-:]/g,"");
        return Object.entries(wellnessListIDs).some(([wellnessName, wellnessObject]) => {
            return wellnessObject.regex.test(title)
        })
    })
}

//Data is not consistent for both TradeTracker and Daisycon. That's why make a mappedPromotion array that returns a consistent object of the necessary data
function createMappedPromotions(filteredPromotions){
    return filteredPromotions.map(promotion => {
        let titlePromotion = promotion.name ? promotion.name : promotion.product_info.title
        titlePromotion = titlePromotion.replace(/[\s,-:]/g,"");
    
        //This IF statement is the case of the Daisycon data from SpaOnline. Make object that's consistent with TradeTracker VakantieVeilingen:
        if(promotion.hasOwnProperty('update_info')){
            promotion.campaignID = Number(promotion.product_info.link.match(/(?<=\?si=)\d+/)[0]);
            promotion.name = promotion.product_info.title;
            promotion.URL = promotion.product_info.link;
            promotion.price = {};
            promotion.oldPrice = promotion.product_info.price_old;
            promotion.price.amount = promotion.product_info.price;
            //For AD Webwinkel it happened that the images array was empty. In that case return null
            promotion.image = promotion.product_info.images.length < 1 ? null : promotion.product_info.images[0].location;
            promotion.properties = {}
            promotion.properties.city = promotion.product_info.keywords;
        } //Below else if is for ActievandeDag || Tripper Image also has to be reset, otherwise the 'else' below won't run
        else if (promotion.campaignID == 10456 || promotion.campaignID == 26224) {
            promotion.oldPrice = Number(promotion.properties.fromPrice[0])
            promotion.image = promotion.images[0]
        } else {
            //In case there is no old price, like for VakantieVeilingen, set it to null to prevent an error
            promotion.oldPrice = null;
            promotion.image = promotion.images[0]
        }
        //Set the wellnessName for each wellness:
        Object.entries(wellnessListIDs).forEach(([wellnessName, wellnessObject]) => {
            if(wellnessObject.regex.test(promotion.name)) promotion.wellnessName = wellnessName;
        })
        return {
            campaignID: promotion.campaignID,
            wellnessName: promotion.wellnessName,
            title: promotion.name,
            url: promotion.URL,
            oldPrice: promotion.oldPrice,
            newPrice: promotion.price.amount,
            discount: promotion.oldPrice && promotion.price.amount ? Math.round((promotion.price.amount - promotion.oldPrice) / promotion.oldPrice * 100) * -1 : null,
            image: promotion.image,
            location: promotion.properties.city,
        }
    })
}

async function fetchAndFilterData(url, network){

    await axios.get(url)
        .then(response =>  {
            let fetchedData = affiliateFeedURLs[network](response);
            promotions.push(...createMappedPromotions(filterPromotions(fetchedData)));
        });
}


async function getAllData(campaign){
    try{
        await fetchAndFilterData(campaign.url, campaign.network);
    }catch(err){
        console.log('Error:', err, '\nthere was a problem with getAllData when trying to get data for: ', campaign)
    }
}


async function main(){
    for(let campaignKey of Object.keys(campaigns)){
        await getAllData(campaigns[campaignKey]);
    }
    for(let i = 0; i < promotions.length; i++) promotions[i]['id'] = i;
    fs.writeFileSync(__dirname+'/../data/promotions.json', JSON.stringify(promotions), ()=> {
        if(err){
            console.log('Error with writing data to promotions.json');
        } else {
            console.log('Wrote data to promotions.json');
        }
    })
    //console.log('promotions: ', promotions);
}

main();