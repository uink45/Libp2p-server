const gossipsubParams = {
    D: 8,
    Dlo: 6,
    Dhi: 12,
    Dlazy: 6,
    heartbeatInterval: 700,
    fanoutTTL: 60000,
    mcacheLength: 6,
    mcacheGossip: 3,
    seenTTL: 550,
    scoreParams: {
        decayInterval: 12000,
        decayToZero: 0.01,
        retainScore: 38400000,
        appSpecificWeight: 1,
        IPColocationFactorThreshold: 3
    },
    scoreThresholds: {
        gossipThreshold: -4000,
        publishThreshold: -8000,
        graylistThreshold: -16000,
        acceptPXThreshold: 100,
        opportunisticGraftThreshold: 5,
    }
}
exports.gossipsubParams = gossipsubParams;