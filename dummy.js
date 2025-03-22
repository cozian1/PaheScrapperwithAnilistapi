const cheerio = require('cheerio');
const { VM } = require('vm');
const { URL } = require('url');

class KwikExtractor {
    constructor() {
        this.cookies = '';
        this.kwikParamsRegex = /\("(\w+)",\d+,"(\w+)",(\d+),(\d+),\d+\)/;
        this.kwikDUrl = /action="([^"]+)"/;
        this.kwikDToken = /value="([^"]+)"/;
    }

    isNumber(s) {
        return !isNaN(s) && !isNaN(parseFloat(s));
    }

    async getHlsStreamUrl(kwikUrl, referer) {
        try {
            const response = await fetch(kwikUrl, {
                headers: { 'Referer': referer }
            });
            const html = await response.text();
            const $ = cheerio.load(html);
            
            const scriptContent = $('script:contains("eval(function")').html();
            const packedCode = scriptContent.split('eval(function(').pop();
            
            const vm = new VM();
            const unpacked = vm.run(`(function() { return ${packedCode} })()`);
            
            return unpacked.match(/const source='([^']+)'/)[1];
        } catch (error) {
            throw new Error(`HLS extraction failed: ${error.message}`);
        }
    }

    async getStreamUrlFromKwik(paheUrl) {
        const noRedirectFetch = (url, opts) => fetch(url, { ...opts, redirect: 'manual' });
        
        try {
            // Get initial redirect
            const redirectRes = await noRedirectFetch(`${paheUrl}/i`);
            const kwikUrl = `https://${redirectRes.headers.get('location').split('https://').at(-1)}`;
            // First request to get cookies
            const fResponse = await fetch(kwikUrl, {
                headers: { 'Referer': 'https://kwik.cx/' }
            });
            this.cookies = fResponse.headers.get('set-cookie');
            
            const fContent = await fResponse.text();
            console.log('Kwik content:', fContent);
            const match = fContent.match(this.kwikParamsRegex);
            if (!match) throw new Error('Kwik params not found');
            
            const [_, fullString, key, v1, v2] = match;
            const decrypted = this.decrypt(fullString, key, parseInt(v1), parseInt(v2));
            
            const uri = decrypted.match(this.kwikDUrl)[1];
            const tok = decrypted.match(this.kwikDToken)[1];
            
            let code = 419;
            let tries = 0;
            let finalLocation = '';

            while (code !== 302 && tries < 20) {
                const formData = new URLSearchParams();
                formData.append('_token', tok);
                
                const res = await noRedirectFetch(uri, {
                    method: 'POST',
                    headers: {
                        'Referer': kwikUrl,
                        'Cookie': this.cookies,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: formData
                });
                
                code = res.status;
                if (res.headers.has('location')) {
                    finalLocation = res.headers.get('location');
                }
                tries++;
            }

            if (tries >= 20) throw new Error('Failed to extract stream URI from kwik');
            return finalLocation;
            
        } catch (error) {
            throw new Error(`Stream URL extraction failed: ${error.message}`);
        }
    }

    decrypt(fullString, key, v1, v2) {
        const keyIndexMap = {};
        [...key].forEach((char, index) => keyIndexMap[char] = index);
        
        const sb = [];
        let i = 0;
        const toFind = key[v2];

        while (i < fullString.length) {
            const nextIndex = fullString.indexOf(toFind, i);
            if (nextIndex === -1) break;
            
            let decodedCharStr = '';
            for (let j = i; j < nextIndex; j++) {
                decodedCharStr += keyIndexMap[fullString[j]] ?? '-1';
            }
            
            i = nextIndex + 1;
            const decodedChar = String.fromCharCode(parseInt(decodedCharStr, v2) - v1);
            sb.push(decodedChar);
        }

        return sb.join('');
    }
}


const extractor = new KwikExtractor();

// // Get HLS stream
// extractor.getHlsStreamUrl('https://kwik.si/e/QMo4UXcn0FBF', 'https://animepahe.ru')
//     .then(url => console.log('HLS URL:', url));

// // Get stream URL
extractor.getStreamUrlFromKwik('https://pahe.win/ixvre')
    .then(url => console.log('Stream URL:', url));