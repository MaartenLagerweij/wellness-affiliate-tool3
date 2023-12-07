const fs = require('fs');

const promotions = JSON.parse(fs.readFileSync(__dirname+'/../data/promotions.json'));

let wellnessNameLen = 0;
let titleLen = 0;
let urlLen = 0;
let imageLen = 0;
let locationLen = 0;

promotions.forEach((promotion,index) => {
    try{
        if(promotion.wellnessName.length > wellnessNameLen) wellnessNameLen = promotion.wellnessName.length;
        if(promotion.title.length > titleLen) titleLen = promotion.title.length;
        if(promotion.url.length > urlLen) urlLen = promotion.url.length;
        if(promotion.image.length > imageLen) imageLen = promotion.image.length;
        if(promotion.location.length > locationLen) locationLen = promotion.location.length;
    } catch(err){
        console.log(`error at row ${index}: ${err.message}`)
    }
})

console.log('wellnessNameLen: ', wellnessNameLen)
console.log('titleLen: ', titleLen)
console.log('urlLen: ', urlLen)
console.log('imageLen: ', imageLen)
console.log('locationLen: ', locationLen)

