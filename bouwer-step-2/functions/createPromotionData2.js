const fs = require('fs');
const axios = require('axios');

const wellnessListIDs = require(__dirname+'/../data/wellnessListIDs.js');

const affiliateFeedURLs = {
    'daisycon': response => response.data.datafeed.programs[0].products,
    'tradetracker': response => response.products,
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
    return filteredPromotions.map((promotion,index) => {
        let titlePromotion = promotion.name ? promotion.name : promotion.product_info.title
        titlePromotion = titlePromotion.replace(/[\s,-:]/g,"");
        //let show = currentWellness["regex"].test(titlePromotion);
    
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
            id: index,
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


async function getAllData(){
    await fetchAndFilterData('https://daisycon.io/datafeed/?media_id=244044&standard_id=16&language_code=nl&locale_id=1&type=JSON&program_id=13146&html_transform=none&rawdata=false&encoding=utf8&general=false', 'daisycon');
    //console.log(createMappedPromotions(promotions));
    console.log('promotions: ', promotions);
}


getAllData();


