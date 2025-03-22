const { deobfuscate } = require('javascript-obfuscator');
const cheerio = require('cheerio');

async function getHlsStreamUrl(kwikUrl, referer) {
    try {
        // 1. Make initial request with referer header
        const response = await fetch(kwikUrl, {
            headers: {
                'Referer': referer
            }
        });
        const html = await response.text();
        
        // 2. Parse HTML with Cheerio
        const $ = cheerio.load(html);
        
        // 3. Find the script containing packed JS
        const scriptContent = $('script:contains("eval(function")').html();
        if (!scriptContent) throw new Error('Packed script not found');
        
        // 4. Extract packed code (Kotlin's substringAfterLast equivalent)
        const packedCode = scriptContent.split('eval(function(').pop();
        
        // 5. Unpack JavaScript (requires JS unpacker implementation)
        const unpacked = unpackPackedCode(packedCode); 
        
        // 6. Extract HLS URL
        const hlsUrl = unpacked.split("const source='")[1].split("';")[0];
        return hlsUrl;
        
    } catch (error) {
        console.error('Error getting HLS URL:', error);
        throw error;
    }
}

// Example unpacker (simplified)

function unpackPackedCode(packed) {
    return deobfuscate(`eval(function${packed}`).code;
}

getHlsStreamUrl('https://kwik.si/e/l8cxmh82A4h3', 'https://animepahe.ru')
    .then(console.log)
    .catch(console.error);