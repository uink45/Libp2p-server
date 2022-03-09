import { NodeId } from "../enr";
/**
 * Computes the xor distance between two NodeIds
 */
export declare function distance(a: NodeId, b: NodeId): bigint;
export declare function log2Distance(a: NodeId, b: NodeId): number;
/**
 * Calculates the log2 distances for a destination given a target and number of distances to request
 * As the size increases, the distance is incremented / decremented to adjacent distances from the exact distance
 */
export declare function findNodeLog2Distances(a: NodeId, b: NodeId, size: number): number[];
