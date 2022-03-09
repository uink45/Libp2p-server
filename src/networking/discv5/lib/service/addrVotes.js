"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddrVotes = void 0;
const is_ip_1 = __importDefault(require("is-ip"));
const MAX_VOTES = 200;
class AddrVotes {
    constructor(addrVotesToUpdateEnr) {
        this.addrVotesToUpdateEnr = addrVotesToUpdateEnr;
        /** Bounded by `MAX_VOTES`, on new votes evicts the oldest votes */
        this.votes = new Map();
        /** Bounded by votes, if the vote count of some `MultiaddrStr` reaches 0, its key is deleted */
        this.tallies = new Map();
    }
    /**
     * Adds vote to a given `recipientIp` and `recipientPort`. If the votes for this addr are greater than `votesToWin`,
     * this function returns the winning `multiaddrStr` and clears existing votes, restarting the process.
     */
    addVote(voter, { recipientIp, recipientPort }) {
        const multiaddrStr = `/${is_ip_1.default.v4(recipientIp) ? "ip4" : "ip6"}/${recipientIp}/udp/${recipientPort}`;
        const prevVote = this.votes.get(voter);
        if (prevVote?.multiaddrStr === multiaddrStr) {
            // Same vote, ignore
            return;
        }
        else if (prevVote !== undefined) {
            // If there was a previous vote, remove from tally
            const prevVoteTally = (this.tallies.get(prevVote.multiaddrStr) ?? 0) - 1;
            if (prevVoteTally <= 0) {
                this.tallies.delete(prevVote.multiaddrStr);
            }
            else {
                this.tallies.set(prevVote.multiaddrStr, prevVoteTally);
            }
        }
        const currentTally = (this.tallies.get(multiaddrStr) ?? 0) + 1;
        // Conclude vote period if there are enough votes for an option
        if (currentTally >= this.addrVotesToUpdateEnr) {
            // If enough peers vote on the same multiaddrStr conclude the vote
            this.clear();
            return { multiaddrStr };
        }
        // Persist vote
        this.tallies.set(multiaddrStr, currentTally);
        this.votes.set(voter, { multiaddrStr, unixTsMs: Date.now() });
        // If there are too many votes, remove the oldest
        if (this.votes.size > MAX_VOTES) {
            for (const vote of this.votes.keys()) {
                this.votes.delete(vote);
                if (this.votes.size <= MAX_VOTES) {
                    break;
                }
            }
        }
    }
    clear() {
        this.votes.clear();
        this.tallies.clear();
    }
}
exports.AddrVotes = AddrVotes;
