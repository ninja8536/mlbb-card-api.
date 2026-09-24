const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(express.json());

// 1. Declare a global browser variable
let browser;

// 2. Launch the browser ONCE when the server starts
async function initBrowser() {
    browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // CRITICAL: Fixes memory crashes in Docker containers
            '--single-process'         // Forces lower memory usage
        ]
    });
    console.log('Global browser initialized');
}
initBrowser();

app.get('/health', (req, res) => res.send('ok'));

app.post('/image', async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ error: "No HTML provided" });

        if (!browser) {
            return res.status(500).json({ error: "Browser is still booting up, please try again" });
        }

        // 3. Open a new TAB instead of a whole new browser
        const page = await browser.newPage();
        
        try {
            await page.setViewport({ width: 1200, height: 1200, deviceScaleFactor: 2 });
            await page.setContent(html);
            
            // 4. Safely look for either card class name so it doesn't crash
            let element = await page.$('.mlbb-card');
            if (!element) {
                element = await page.$('.card');
            }
            if (!element) {
                element = await page.$('body'); // Fallback
            }

            const imageBuffer = await element.screenshot({ type: 'png' });
            
            const form = new FormData();
            form.append('file', imageBuffer, { filename: 'mlbbcard.png' });

            const discordRes = await axios.post(process.env.DISCORD_WEBHOOK_URL + "?wait=true", form, {
                headers: form.getHeaders()
            });

            res.json({ url: discordRes.data.attachments[0].url });
            
        } finally {
            // 5. This ALWAYS runs, even if the screenshot fails, preventing memory leaks
            await page.close();
        }

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: 'Failed to generate image' });
    }
});

app.listen(3000, () => console.log('API is running on port 3000'));
