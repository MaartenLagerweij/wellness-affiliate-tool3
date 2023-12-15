const fs = require('fs');
const dotenv = require('dotenv').config({path: __dirname+'/../.env'});
const mysql = require('mysql');

const promotions = JSON.parse(fs.readFileSync(__dirname+'/../data/promotions.json'));

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
})

connection.connect((err) => {
    if (err) {
        console.log('Fout bij het verbinden met database', err.stack);
        return;
    }
    console.log('Succesvol verbonden met de database. ID: ' + connection.threadId);

    connection.query('TRUNCATE TABLE promotions', (err, result)=> {
        if(err) return console.log('There was an error with emptying the \'promotions\' table');
        console.log('\'promotions\' table emptied');
    })

    const insertQuery = `
    INSERT INTO promotions (campaignID, wellnessName, title, url, oldPrice, newPrice, discount, image, location, id) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    promotions.forEach((promotion,i) => {
        //If not the row below then error in adding it to SQL, since doesn't support empty arrays:
        if(typeof promotion.location == 'object' && promotion.location.length < 1) promotion.location = '';
        connection.query(insertQuery, [promotion.campaignID, promotion.wellnessName, promotion.title, promotion.url, promotion.oldPrice, promotion.newPrice, promotion.discount, promotion.image, promotion.location, promotion.id], (err, result) => {
            if (err) {
                console.log('Fout bij het invoegen van data', err);
                return;
            }
            console.log('Data succesvol toegevoegd:', result);
        });
    });

    connection.end(); // Sluit de verbinding na de query
});
