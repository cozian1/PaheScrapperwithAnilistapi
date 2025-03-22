const Cheerio = require("cheerio");
const { formatString } = require("./util");

const Base_url = 'https://animepahe.ru'
const api_url = 'https://animepahe.ru/api?m=release&id={0}&sort=episode_desc&page={1}';
const Kiwk_api_url = "https://animepahe.com/api?m=embed&p=kwik&id="
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
    'Content-Type': 'application/json'
};

async function getDdgCookies(url) {
    try {
        // Step 1: Get the initial check.js response
        const checkJsResponse = await fetch('https://check.ddos-guard.net/check.js');
        const checkJsBody = await checkJsResponse.text();
        
        // Extract the well-known path between single quotes
        const wellKnown = checkJsBody.split("'")[1] || '';
        
        // Step 2: Build verification URL
        const urlObj = new URL(url);
        const checkUrl = `${urlObj.protocol}//${urlObj.host}${wellKnown}`;
        
        // Step 3: Make verification request
        const finalResponse = await fetch(checkUrl);
        
        // Step 4: Get all cookies from headers
        const setCookieHeader = finalResponse.headers.get('set-cookie') || '';
        console.log(setCookieHeader);
        // Parse multiple cookies from header
        const cookies = setCookieHeader
            .split(', ') // Split individual cookies
            .map(cookieStr => {
                // Split into name=value and attributes
                const [nameValue, ...attributes] = cookieStr.split('; ');
                const [name, value] = nameValue.split('=');
                return { name, value };
            })
            .filter(cookie => cookie.name.startsWith('__ddg'));
        headers.Cookie = cookies[0].name + '=' + cookies[0].value;
        return cookies;
    } catch (error) {
        console.error('Error in DDG cookie flow:', error);
        return [];
    }
}

async function getEpisodes(id) {
    const url = formatString(api_url, id, 1);
    await getDdgCookies(url);
    console.log(url);
    const data = await fetch(url, {
        headers: headers
    }).then(res => res.json());
    return data
}

async function search(query) {

    try {
        const url = `https://animepahe.ru/api?m=search&q=${encodeURIComponent(query)}`;
        // Add cookie to headers
        if(!headers.Cookie){
            await getDdgCookies(url);
        }
        const response = await fetch(url, {
            headers: headers
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching search results:', error);
        throw error;
    }
}

async function getKwikLinks(animeSession, epsession) {
    try {
        const url = `${Base_url}/play/${animeSession}/${epsession}`;
        console.log(url);

        // Add cookie to headers
        if(!headers.Cookie){
            await getDdgCookies(url);
        }
        const response = await fetch(url, {
            headers: headers
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await  videoListParse(await response.text());
    } catch (error) {
        console.error('Error fetching episode results:', error);
        throw error;
    }
}
async function videoListParse(response) {
    const $ = Cheerio.load(response);
    const downloadLinks = $('#pickDownload > a');
    const videos = [];
    
    $('#resolutionMenu > button').each((index, btn) => {
        const $btn = $(btn);
        const kwikLink = $btn.attr('data-src');
        const audio= $btn.attr('data-audio');
        const quality = $btn.text();
        const paheWinLink = $(downloadLinks[index]).attr('href');
        
        videos.push({
            PaheWinUrl:paheWinLink,
            kwikLink: kwikLink,
            audio: audio,
            quality: quality
        });
    });
    
    return videos;
}

exports.getEpisodes = getEpisodes;
exports.getDdgCookies = getDdgCookies;
exports.search = search;
exports.getKwikLinks = getKwikLinks;
