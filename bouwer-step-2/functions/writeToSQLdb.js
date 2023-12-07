const fs = require('fs');
const dotenv = require('dotenv').config({path: __dirname+'/../.env'});

const promotions = JSON.parse(fs.readFileSync(__dirname+'/../data/promotions.json'));

//console.log(promotions);
console.log(process.env.TESTNAME)