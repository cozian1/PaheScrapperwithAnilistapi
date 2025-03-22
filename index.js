const { search, getEpisodes, getKwikLinks } = require("./Pahe");

// Usage
(async function test (){
    searchres=await search('jujutsu kaisen');
    episoderes=await getEpisodes(searchres.data[3].session);
    console.log(episoderes);
})();
