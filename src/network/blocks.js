const types = require("@chainsafe/lodestar-types");
const ssz = require("@chainsafe/ssz");

class Blocks{
    constructor(config, clock){                    
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
        const finalizedCheckpoint = types.ssz.phase0.Checkpoint.defaultValue();
        const genesisValidatorsRoot = ssz.fromHexString("0x4b363db94e286120d76eb905340fdd4e54bfe9f06bf33ff6cf5ad27f511bfe95");
        const statusBlock = {
            forkDigest: this.config.forkName2ForkDigest(this.config.getForkName(this.clock.currentSlot)),
            finalizedRoot:  ssz.fromHexString(ssz.toHexString(finalizedCheckpoint.root)),
            finalizedEpoch: finalizedCheckpoint.epoch,
            headRoot: genesisValidatorsRoot,
            headSlot: 0,
        }        
        return statusBlock;
    }

    updateStatusBlock(finalizedBlock, currentBlock){
        const statusBlock = {
            forkDigest: this.config.forkName2ForkDigest(this.config.getForkName(this.clock.currentSlot)),
            finalizedRoot: ssz.fromHexString(ssz.toHexString(types.ssz.phase0.BeaconBlockHeader.createTreeBackedFromStruct(finalizedBlock.message).hashTreeRoot())),
            finalizedEpoch: this.clock.currentEpoch - 2,
            headRoot: ssz.fromHexString(ssz.toHexString(types.ssz.phase0.BeaconBlockHeader.createTreeBackedFromStruct(currentBlock.message).hashTreeRoot())),
            headSlot: currentBlock.message.slot,
        } 
        this.statusBlock = statusBlock;
    }

    updateFinalisedStatusBlock(response){
        const statusBlock = {
            forkDigest: this.config.forkName2ForkDigest(this.config.getForkName(this.clock.currentSlot)),
            finalizedRoot: ssz.fromHexString(ssz.toHexString(types.ssz.phase0.BeaconBlockHeader.createTreeBackedFromStruct(response.message).hashTreeRoot())),
            finalizedEpoch: Math.floor(response.message.slot / 32),
            headRoot: this.statusBlock.headRoot,
            headSlot: this.statusBlock.headSlot,
        }
        this.statusBlock = statusBlock;
    }
}
exports.Blocks = Blocks;