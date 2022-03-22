const types = require("@chainsafe/lodestar-types");
const ssz = require("@chainsafe/ssz");

class Blocks{
    constructor(state, config, clock){        
        this.storedBlocks = [ ];
        this.statusBlocks = [ ];
        this.state = state;
        this.clock = clock;
        this.config = config;
        this.statusBlocks.push(this.createStatusBlock());
        
    }
    getHeadState(){
        return this.state;
    }

    getStatus(){
        return this.statusBlocks[this.statusBlocks.length - 1];
    }

    createStatusBlock(){
        const blockHeader = types.ssz.phase0.BeaconBlockHeader.createTreeBackedFromStruct(this.state.latestBlockHeader); 
        const finalizedCheckpoint = types.ssz.phase0.Checkpoint.createTreeBackedFromStruct(this.state.finalizedCheckpoint);
        
        
        return{
            forkDigest: this.config.forkName2ForkDigest(this.config.getForkName(this.clock.currentSlot)),
            finalizedRoot: finalizedCheckpoint.root,
            finalizedEpoch: this.state.finalizedCheckpoint.epoch,
            headRoot: blockHeader.hashTreeRoot(),
            headSlot: blockHeader.slot,
        }
    }
}
exports.Blocks = Blocks;