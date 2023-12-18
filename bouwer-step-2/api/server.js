const express = require('express');
const ngrok = require('ngrok');
const { getPromotions } = require(__dirname+'/../functions/readFromDB.js');

const app = express();
const port = 3000;

app.get('/promotions', async (req, res) => {
    const promotions = await getPromotions();
    res.json(promotions);
})
app.listen(port, ()=> {
    console.log(`server running on port ${port}`)
    ngrok.connect(port).then((ngrokUrl)=> {
        console.log('tunnel opened on ', ngrokUrl)
    })
});
