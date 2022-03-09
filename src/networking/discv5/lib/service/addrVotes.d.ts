import { NodeId } from "../enr";
export declare class AddrVotes {
    private readonly addrVotesToUpdateEnr;
    /** Bounded by `MAX_VOTES`, on new votes evicts the oldest votes */
    private readonly votes;
    /** Bounded by votes, if the vote count of some `MultiaddrStr` reaches 0, its key is deleted */
    private readonly tallies;
    constructor(addrVotesToUpdateEnr: number);
    /**
     * Adds vote to a given `recipientIp` and `recipientPort`. If the votes for this addr are greater than `votesToWin`,
     * this function returns the winning `multiaddrStr` and clears existing votes, restarting the process.
     */
    addVote(voter: NodeId, { recipientIp, recipientPort }: {
        recipientIp: string;
        recipientPort: number;
    }): {
        multiaddrStr: string;
    } | undefined;
    clear(): void;
}
