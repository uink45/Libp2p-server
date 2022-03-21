const { fetchState } = require('./initialise');
const network = require('./network');


async function launch(){
    const state = await fetchState();
    console.log(state);
}

launch();








