require('dotenv').config()
const serverless = require("serverless-http");
const express = require('express');
const puppeteer = require('puppeteer');
const chromium = require('chrome-aws-lambda');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { google } = require("googleapis");
const OAuth2 = google.auth.OAuth2;
// Inicializar Puppeteer con Stealth Plugin
// puppeteer.use(StealthPlugin());

const app = express();
const router = express.Router();
app.use(cors());
app.use(express.json());

let scrappingStatus = 'idle';  // Estado para la UI


// Ruta para iniciar el scrapping
app.post('/start-scrapper', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ message: 'URL es requerida.' });
    }

    scrappingStatus = 'running';

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        const soldOutSelector = '.sold-out-class'; // Cambiar el selector
        const isAvailable = await page.$(soldOutSelector) === null;

        if (isAvailable) {
            scrappingStatus = 'available';
            console.log('El producto está disponible');
            await sendNotificationEmail();
        } else {
            scrappingStatus = 'sold out';
            console.log('El producto sigue agotado.');
        }
    } catch (error) {
        console.error('Error en el scrapper:', error);
        scrappingStatus = 'error';
    } finally {
        await browser.close();
    }

    return res.json({ status: scrappingStatus });
});

// Ruta para obtener el estado del scrapper
app.get('/status', (req, res) => {
    return res.json({ status: scrappingStatus });
});
app.get('/products/nike', async (req, res) => {

    const  url  = 'https://www.nike.com/launch'
    
    // if (!url) {
    //     return res.status(400).json({ message: 'URL es requerida.' });
    // }

    scrappingStatus = 'running';

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    try {
        await page.goto(url, { waitUntil: 'networkidle2' });

        const products = await page.$$eval(
            'figure', 
            (results) => (
              results.map((el) => {
                const tittle = el.querySelector('h2')?.innerText
                if (!tittle) return null
                const subTittle = el.querySelector('h1')?.innerText
                return {tittle, subTittle}
            })
            ))
        console.log(products)
        await browser.close()
        return res.json(products)
    } catch (error) {
        console.error('Error en el scrapper:', error);
        scrappingStatus = 'error';
    } finally {
        await browser.close();
    }

});

// Enviar correo de notificación
async function sendNotificationEmail() {
    const oauth2Client = new OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        "https://developers.google.com/oauthplayground"
      );
      
      oauth2Client.setCredentials({
        refresh_token:
          process.env.REFRESH_TOKEN,
      });
      
      const CLIENT_ID = "9153435564-f3o0juoplad0qj0mm51ji6hect63bt82.apps.googleusercontent.com"
      const CLIENT_SECRET = "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"
      const REFRESH_TOKEN = "1//04i-f086Dn2I0CgYIARAAGAQSNwF-L9IrkTElbY1DXzMmsM1RgfBGRWiDd7Bfxjf_zaFqhRYDziNtyA_Q9z_pETgzAL--HzPQ5Hg"
      const USER_EMAIL_SENDER = "hackme0880@gmail.com"
      const accessToken = oauth2Client.getAccessToken();
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            type: "OAuth2",
            user: process.env.USER_EMAIL_SENDER,
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            refreshToken: process.env.REFRESH_TOKEN,
            accessToken
            

        },
      });

    const mailOptions = {
        from: 'hackme0880@gmail.com',
        to: 'vmhowleyh@gmail.com',
        subject: 'Producto disponible',
        text: 'El producto que estabas esperando ya está disponible!',
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
        console.error('Error occurred:', error);
        } else {
        console.log('Email sent successfully:', info.response);
        }
     });
}


app.listen(4000, () => {
    console.log(`Server running on port 4000`);
});
app.use("/.netlify/functions/app", router);
module.exports.handler = serverless(app);