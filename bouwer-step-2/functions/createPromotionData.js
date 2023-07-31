//This whole file is used to first receive the data and then create a mappedPromotions array of all promotions that each contains an object with only the necessary data
const wellnessListIDs = require('../data/wellnessListIDs.js');
const spaOnlineDaisyconJSON = require('../data/daisycon-spaonline.json');
const vakantieVeilingenTradeTrackerJSON = require('../data/vakantieveilingen-tradetracker.json');
const actievandedagTradetrackerJSON = require('../data/actievandedagTradetracker.json');
const ticketveilingTradetrackerJSON = require('../data/ticketveilingTradetracker.json');
const tripperTradetrackerJSON = require('../data/tripperTradetracker.json');
//Couldn't find usefull data for Zoweg, so commenting it out for now
const zowegTradetrackerJSON = require('../data/zowegTradetracker.json');
const ADWebwinkelDaisyconJSON = require('../data/ADWebwinkelDaisycon.json');
const hotelspecialsTradetrackerJSON = require('../data/hotelspecialsTradetracker.json');

//Create a promotions array to push all the affiliate promotions to from the various .json files
const promotions = [];
spaOnlineDaisyconJSON.datafeed.programs[0].products.forEach(promotion => promotions.push(promotion));
vakantieVeilingenTradeTrackerJSON.products.forEach(promotion => promotions.push(promotion));
actievandedagTradetrackerJSON.products.forEach(promotion => promotions.push(promotion));
ticketveilingTradetrackerJSON.products.forEach(promotion => promotions.push(promotion));
tripperTradetrackerJSON.products.forEach(promotion => promotions.push(promotion));
zowegTradetrackerJSON.products.forEach(promotion => promotions.push(promotion));
ADWebwinkelDaisyconJSON.datafeed.programs[0].products.forEach(promotion => promotions.push(promotion));
hotelspecialsTradetrackerJSON.products.forEach(promotion => promotions.push(promotion))


//Filter the promotions array to only keep ones with matching titles to the regex of the wellnessListIDs
const filteredPromotions = promotions.filter(promotion => {
    let title = promotion.name || promotion.product_info.title
    title = title.replace(/[\s,-:]/g,"");
    return Object.entries(wellnessListIDs).some(([, wellnessObject]) => {
        return wellnessObject.regex.test(title)
    })
})


//Data is not consistent for both TradeTracker and Daisycon. That's why make a mappedPromotion array that returns a consistent object of the necessary data
const mappedPromotions = filteredPromotions.map((promotion,index) => {
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
    //Only return the correct data for each promotion I need
    return {
        id: index,
        campaignID: promotion.campaignID,
        title: promotion.name,
        url: promotion.URL,
        oldPrice: promotion.oldPrice,
        newPrice: promotion.price.amount,
        image: promotion.image,
        location: promotion.properties.city,
    }
})
console.log(mappedPromotions);

// //Create object with number of products for each campagne, which can be used in the filter
// const numPromotionsForFilter = {
//     'all': promotions.length,
//     'SpaOnline.com': spaOnlineDaisyconJSON.datafeed.programs[0].products.length,
//     'VakantieVeilingen': vakantieVeilingenTradeTrackerJSON.products.length,
//     'ActievandeDag': actievandedagTradetrackerJSON.products.length,
//     'TicketVeiling': ticketveilingTradetrackerJSON.products.length,
//     'Tripper': tripperTradetrackerJSON.products.length,
//     // 'ZoWeg': zowegTradetrackerJSON.products.length,
//     // 'ADWebwinkel': ADWebwinkelDaisyconJSON.datafeed.programs[0].products.length,
//     'HotelSpecials': hotelspecialsTradetrackerJSON.products.length,
// }