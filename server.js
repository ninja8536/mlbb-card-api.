const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const FormData = require('form-data');

const app = express();
app.use(express.json());

app.post('/image', async (req, res) => {
  try {
    const { html } = req.body;
    if (!html) return res.status(400).json({ error: 'No HTML provided' });

    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 500, height: 400 });
    await page.setContent(html);
    const element = await page.$('.mlbb-card');
    const imageBuffer = await element.screenshot({ type: 'png' });
    await browser.close();

    const form = new FormData();
    form.append('image', imageBuffer.toString('base64'));
    const imgbbRes = await axios.post(`https://api.imgbb.com/1/upload?key=${process.env.IMGBB_KEY}`, form);

    res.json({ url: imgbbRes.data.data.url });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

app.listen(3000, () => console.log('API is running!'));
