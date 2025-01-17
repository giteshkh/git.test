const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');
const fs = require('fs');
const https = require('https');
const path = require('path');
const axios = require('axios');
const BROWSERSTACK_USERNAME = 'giteshkhare_4duhVR'; 
const BROWSERSTACK_ACCESS_KEY = 'BZfJR4x4puuqs8UtKqXV'; 
const capabilitiesList = [
    {
        browserName: 'Chrome',
        browser_version: 'latest',
        os: 'Windows',
        os_version: '10',
    },
    {
        browserName: 'Firefox',
        browser_version: 'latest',
        os: 'Windows',
        os_version: '10',
    },
    {
        browserName: 'Safari',
        device: 'iPhone 14',
        os_version: '16',
        realMobile: 'true',
    },
    {
        browserName: 'Chrome',
        device: 'Samsung Galaxy S23',
        os_version: '13.0',
        realMobile: 'true',
    },
    {
        browserName: 'Edge',
        browser_version: 'latest',
        os: 'Windows',
        os_version: '11',
    },
];
async function dwnImg(url, filePath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', (err) => {
            fs.unlink(filePath, () => reject(err));
        });
    });
}
function countRepWords(headers) {
    const wCount = {};
    const cText = headers.join(' ').toLowerCase().split(/\W+/);

    cText.forEach(word => {
        if (word) wCount[word] = (wCount[word] || 0) + 1;
    });

    for (const [word, count] of Object.entries(wCount)) {
        if (count > 2) {
            console.log(`Word that are repeated more than 2 times - Word: '${word}', Count: ${count}`);
        }
    }
}
async function googTranslate(text, fromLang, toLang) {
    const url = `https://google-translate113.p.rapidapi.com/api/v1/translator/text`;
    try {
        const res = await axios.post(url, { from: fromLang, to: toLang, text }, {
            headers: {
                'x-rapidapi-key': 'faad5c707dmshc5be17f4c61f33fp140b25jsn7f490a79dd3a', // Replace with your API key
                'x-rapidapi-host': 'google-translate113.p.rapidapi.com',
                'Content-Type': 'application/json',
            },
        });
        return res.data.trans;
    } catch (error) {
        console.error('Translation Error:', error.response?.data || error.message);
    }
}
async function main(capabilities) {
    const driver = await new Builder()
        .usingServer(`https://${BROWSERSTACK_USERNAME}:${BROWSERSTACK_ACCESS_KEY}@hub-cloud.browserstack.com/wd/hub`)
        .withCapabilities({
            ...capabilities,
            'bstack:options': {
                os: capabilities.os,
                osVersion: capabilities.os_version,
                realMobile: capabilities.realMobile || false,
            },
        })
        .build();
    try {
        const url = 'https://elpais.com/';
        const expectedLanguage = 'es-ES';
        await driver.get(url);
        await driver.wait(() => driver.getCurrentUrl().then(currentUrl => currentUrl === url), 3000);
        const htmlElement = await driver.wait(until.elementLocated(By.tagName('html')), 3000);
        const langAttribute = await htmlElement.getAttribute('lang');
        assert.strictEqual(await driver.getCurrentUrl(), url, 'Loaded URL does not match expected');
        assert.strictEqual(langAttribute, expectedLanguage, `Language does not match. Expected: ${expectedLanguage}, Found: ${langAttribute}`);
        console.log('URL and Language validated!');
        await driver.findElement(By.id('didomi-notice-agree-button')).click();
        await driver.findElement(By.css("a[data-mrf-link='https://elpais.com/opinion/']")).click();
        await driver.wait(() => driver.executeScript('return document.readyState').then(state => state === 'complete'), 3000);
        const articles = await driver.findElements(By.tagName('article'));
        console.log(`Found ${articles.length} articles.`);
        const articlesData = [];
        for (let i = 0; i < Math.min(5, articles.length); i++) {
            const article = articles[i];
            const title = await article.findElement(By.css('.c_t')).getText().catch(() => null);
            const author = await article.findElement(By.css('.c_a')).getText().catch(() => null);
            const description = await article.findElement(By.css('.c_d')).getText().catch(() => null);
            const extraPoints = await article.findElement(By.css('.c_r')).getText().catch(() => null);
            const imageUrl = await article.findElement(By.css('img')).getAttribute('src').catch(() => null);
            articlesData.push({ title, author, description, extraPoints, imageUrl });
        }
        console.log('Fetched Articles:', articlesData);
        for (let i = 0; i < articlesData.length; i++) {
            const { imageUrl } = articlesData[i];
            if (imageUrl) {
                const fileName = `article_${i + 1}.jpg`;
                const filePath = path.join(__dirname, 'images', fileName);
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                try {
                    await dwnImg(imageUrl, filePath);
                    console.log(`Image Scraped Successfully for article ${i + 1} saved as ${fileName}`);
                } catch (err) {
                    console.error(`Failed to scrape image for article ${i + 1}:`, err.message);
                }
            }
        }
        const headers = [];
        for (let i = 0; i < articlesData.length; i++) {
            const { title } = articlesData[i];
            const translatedTitle = await googTranslate(title, 'es', 'en');
            articlesData[i].translatedTitle = translatedTitle;
            headers[i] = translatedTitle;
            console.log(`Translated Title ${i + 1}:`, translatedTitle);
        }
        countRepWords(headers);
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await driver.quit();
    }
}
(async () => {
    await Promise.all(capabilitiesList.map((capabilities) => main(capabilities)));
})();