"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findNodeLog2Distances = exports.log2Distance = exports.distance = void 0;
const bigint_buffer_1 = require("bigint-buffer");
const util_1 = require("../util");
const constants_1 = require("./constants");
/**
 * Computes the xor distance between two NodeIds
 */
function distance(a, b) {
    return bigint_buffer_1.toBigIntBE(util_1.fromHex(a)) ^ bigint_buffer_1.toBigIntBE(util_1.fromHex(b));
}
exports.distance = distance;
function log2Distance(a, b) {
    let firstMatch = 0;
    for (let i = 0; i < a.length; i++) {
        const xoredNibble = Number.parseInt(a[i], 16) ^ Number.parseInt(b[i], 16);
        if (xoredNibble) {
            if (xoredNibble & 0b1000) {
                firstMatch += 0;
            }
            else if (xoredNibble & 0b0100) {
                firstMatch += 1;
            }
            else if (xoredNibble & 0b0010) {
                firstMatch += 2;
            }
            else if (xoredNibble & 0b0001) {
                firstMatch += 3;
            }
            break;
        }
        else {
            firstMatch += 4;
        }
    }
    return constants_1.NUM_BUCKETS - firstMatch;
}
exports.log2Distance = log2Distance;
/**
 * Calculates the log2 distances for a destination given a target and number of distances to request
 * As the size increases, the distance is incremented / decremented to adjacent distances from the exact distance
 */
function findNodeLog2Distances(a, b, size) {
    if (size <= 0) {
        throw new Error("Iterations must be greater than 0");
    }
    if (size > 127) {
        throw new Error("Iterations cannot be greater than 127");
    }
    let d = log2Distance(a, b);
    if (d === 0) {
        d = 1;
    }
    const results = [d];
    let difference = 1;
    while (results.length < size) {
        if (d + difference <= 256) {
            results.push(d + difference);
        }
        if (d - difference > 0) {
            results.push(d - difference);
        }
        difference += 1;
    }
    return results.slice(0, size);
}
exports.findNodeLog2Distances = findNodeLog2Distances;
