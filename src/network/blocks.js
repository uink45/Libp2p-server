const types = require("@chainsafe/lodestar-types");
const ssz = require("@chainsafe/ssz");

class Blocks{
    constructor(state, config, clock){                    
        this.state = state;
        this.clock = clock;
        this.config = config;
        this.statusBlock = this.createFirstStatusBlock();      
        this.storedBlocks = [];
    }
    
    getHeadState(){
        return this.state;
    }

    getStatus(){
        return this.statusBlock;
    }

    createFirstStatusBlock(){
        const blockHeader = types.ssz.phase0.BeaconBlockHeader.createTreeBackedFromStruct(this.state.latestBlockHeader);     
        const statusBlock = {
            forkDigest: this.config.forkName2ForkDigest(this.config.getForkName(this.clock.currentSlot)),
            finalizedRoot:  ssz.fromHexString(ssz.toHexString(this.state.finalizedCheckpoint.root)),
            finalizedEpoch: this.state.finalizedCheckpoint.epoch,
            headRoot: blockHeader.hashTreeRoot(),
            headSlot: blockHeader.slot,
        }        
        return statusBlock;
    }

    createStatusBlock(response){
        const statusBlock = {
            forkDigest: this.config.forkName2ForkDigest(this.config.getForkName(this.clock.currentSlot)),
            finalizedRoot: ssz.fromHexString(ssz.toHexString(this.state.finalizedCheckpoint.root)),
            finalizedEpoch:  this.state.finalizedCheckpoint.epoch,
            headRoot: ssz.fromHexString(ssz.toHexString(types.ssz.phase0.BeaconBlockHeader.createTreeBackedFromStruct(response.message).hashTreeRoot())),
            headSlot: response.message.slot,
        } 
        this.statusBlock = statusBlock;
    }
}
exports.Blocks = Blocks;