import { TreeBacked } from "@chainsafe/ssz";
import { allForks } from "@chainsafe/lodestar-types";
import { IBeaconNodeOptions } from "@chainsafe/lodestar";
import { IChainConfig, IChainForkConfig } from "@chainsafe/lodestar-config";
import { RecursivePartial } from "@chainsafe/lodestar-utils";
export declare type NetworkName = "mainnet" | "pyrmont" | "prater" | "dev";
export declare const networkNames: NetworkName[];
export declare function getNetworkBeaconParams(network: NetworkName): IChainConfig;
export declare function getNetworkBeaconNodeOptions(network: NetworkName): RecursivePartial<IBeaconNodeOptions>;
/**
 * Get genesisStateFile URL to download. Returns null if not available
 */
export declare function getGenesisFileUrl(network: NetworkName): string | null;
/**
 * Fetches the latest list of bootnodes for a network
 * Bootnodes file is expected to contain bootnode ENR's concatenated by newlines
 */
export declare function fetchBootnodes(network: NetworkName): Promise<string[]>;
/**
 * Fetch weak subjectivity state from a remote beacon node
 */
export declare function fetchWeakSubjectivityState(config: IChainForkConfig, url: string): Promise<TreeBacked<allForks.BeaconState>>;
//# sourceMappingURL=index.d.ts.map