//getPromotions is used inside /wellness-affiliate-tool3/bouwer-step-2/api/server.js
const { connection } = require(__dirname+'/../api/database');

getPromotions = async function(){
    return new Promise((resolve, reject)=>{
        connection.connect((err)=>{
            if(err) {
                console.log('There was an error connecting to the database from getPromotions ', err.stack)
                return reject(err);
            }
            console.log('Connected to the database ', connection.threadId);
    
            const getDataQuery = 'SELECT * FROM `promotions`';
            connection.query(getDataQuery, (err, result)=> {
                if(err) {
                    console.log('Error getting the data', err);
                    return reject();
                }
                return resolve(result);
            })
    
            connection.end();
    
        })
    })
}

module.exports = {
    getPromotions
}