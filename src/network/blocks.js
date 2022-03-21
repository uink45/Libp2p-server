const constants_1 = require("../constants");

class Blocks{
    constructor(state, clock, config){
        this.storedBlocks = [ ];
        this.state = state;
        this.clock = clock;
        this.config = config;
    }
    getHeadState(){
        return this.state;
    }

    getStatus(){

    }
}
exports.Blocks = Blocks;