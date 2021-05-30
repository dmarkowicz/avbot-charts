const https = require('https');
const axios = require('axios').default;
const cheerio = require('cheerio');

const logger = require('../logger');
const getAirports = require('../getAirports');
const saveLink = require('../saveLink');

const aipURL = 'https://ais.mn/files/aip/eAIP/valid/html'
const api = axios.create({
  baseURL: aipURL,
  timeout: 10000,
  httpsAgent: new https.Agent({ rejectUnauthorized: false, keepAlive: true }),
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Safari/537.36 Edg/89.0.774.45',
    connection: 'keep-alive'
  }
});

async function getChart($, icao) {
  try {
    const lnk = $(`a[id="AD-2.${icao}"]`).attr('href')
    if (!lnk) throw new Error('Not Found');
    logger.info(`(${icao}) ${aipURL}/eAIP/${lnk}`);

    return `${aipURL}/eAIP/${lnk}`
  } catch (error) {
    logger.error(`(${icao}) ${error}`);
    return 'error';
  }
}

module.exports = async () => {
  logger.debug(`MONGOLIA`);
  let aipRes = await api.get(`/index-en-MN.html`);
  let $ = cheerio.load(aipRes.data);
  let lnk = $(`frame[name="eAISNavigationBase"]`).attr('src')
  logger.info(`${aipURL}/${lnk}`);

  aipRes = await api.get(`/${lnk}`)
  $ = cheerio.load(aipRes.data);
  lnk = $(`frame[name="eAISNavigation"]`).attr('src')
  logger.info(`${aipURL}/${lnk}`);

  aipRes = await api.get(`/${lnk}`)
  $ = cheerio.load(aipRes.data);

  const airports = getAirports('MN');

  const chartLinks = []

  for (let i = 0; i < airports.length; i++) {
    const res = await getChart($, airports[i])
    if (res !== 'error') {
      chartLinks.push({ icao: airports[i], link: res });
    }
  }

  for (let i = 0; i < chartLinks.length; i++) {
    await saveLink(chartLinks[i])
  }

  logger.debug('MONGOLIA DONE!');
}