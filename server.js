const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(express.json());
app.get('/health', (req, res) => res.send('ok'));
app.post('/image', async (req, res) => {
    try {
        const { html } = req.body;
        if (!html) return res.status(400).json({ error: "No HTML provided" });

        const browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 1200, deviceScaleFactor: 2 });
        await page.setContent(html);
        const element = await page.$('.mlbb-card');
        const imageBuffer = await element.screenshot({ type: 'png' });
        await browser.close();

        const form = new FormData();
        // Send the buffer to Discord and name it as a .png file
        form.append('file', imageBuffer, { filename: 'mlbbcard.png' });

        // Send the image to the Webhook channel (URL is stored in Render's Environment tab)
        const discordRes = await axios.post(process.env.DISCORD_WEBHOOK_URL + "?wait=true", form, {
            headers: form.getHeaders()
        });

        // Grab the native Discord CDN link and send it back to BotGhost
        res.json({ url: discordRes.data.attachments[0].url });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate image' });
    }
});

app.listen(3000, () => console.log('API is running'));
