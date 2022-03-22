
/**
 * The ReqRespHandler module handles app-level requests / responses from other peers,
 * fetching state from the chain and database as needed.
 */
function getReqRespHandlers({ blocks }) {
    return {
        async *onStatus() {
            yield blocks.getStatus();
        },
        async *onBeaconBlocksByRange(req) {
            yield* null;
        },
        async *onBeaconBlocksByRoot(req) {
            yield* null;
        },
    };
}
exports.getReqRespHandlers = getReqRespHandlers;
//# sourceMappingURL=index.js.map