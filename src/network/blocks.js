const types = require("@chainsafe/lodestar-types");
const ssz = require("@chainsafe/ssz");

class Blocks{
    constructor(status, config, clock){        
        this.storedBlocks = [ ];
        this.statusBlocks = [ ];
        this.status = status;
        this.clock = clock;
        this.config = config;
        this.statusBlocks.push(this.createStatusBlock());
        
    }

    getStatus(){
        return this.statusBlocks[this.statusBlocks.length - 1];
    }

    createStatusBlock(){
        const blockHeader = types.ssz.phase0.BeaconBlockHeader.createTreeBackedFromStruct(this.status.blockHeader.message); 
        const finalizedCheckpoint = types.ssz.phase0.Checkpoint.createTreeBackedFromStruct(this.status.finalizedCheckpoint);
        return{
            forkDigest: this.config.forkName2ForkDigest(this.config.getForkName(this.clock.currentSlot)),
            finalizedRoot: finalizedCheckpoint.root,
            finalizedEpoch: this.status.finalizedCheckpoint.epoch,
            headRoot: blockHeader.hashTreeRoot(),
            headSlot: blockHeader.slot,
        }
    }
}
exports.Blocks = Blocks;