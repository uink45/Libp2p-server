import { ISessionConfig } from "../session";
import { ILookupConfig } from "../kademlia";
export declare type IDiscv5Config = ISessionConfig & ILookupConfig & {
    /**
     * The time between pings to ensure connectivity amongst connected nodes
     * defined in milliseconds
     */
    pingInterval: number;
    /**
     * Whether to enable enr auto-updating
     */
    enrUpdate: boolean;
    /**
     * The minimum number of peer's who agree on an external IP port before updating the local ENR.
     */
    addrVotesToUpdateEnr: number;
};
export declare const defaultConfig: IDiscv5Config;
