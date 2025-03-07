"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcClient = void 0;
const client_1 = require("@mysten/sui/client");
class RpcClient extends client_1.SuiClient {
    async queryEventsByPage(query, cursor, limit) {
        let result = [];
        let hasNextPage = true;
        let nextCursor = cursor ? cursor : null;
        do {
            const res = await this.queryEvents({
                query,
                cursor: nextCursor,
                limit: limit ? limit : null,
            });
            if (res.data) {
                result = [...result, ...res.data];
                hasNextPage = res.hasNextPage;
                nextCursor = res.nextCursor;
            }
            else {
                hasNextPage = false;
            }
        } while (hasNextPage);
        return result;
    }
    async fetchOwnedObjects(owner, query, maxIter, cursor, limit) {
        let result = [];
        let hasNextPage = true;
        let nextCursor = cursor ? cursor : null;
        let iter = 0;
        do {
            const res = await this.getOwnedObjects({
                owner,
                ...query,
                cursor: nextCursor,
                limit: limit ? limit : null,
            });
            if (res.data) {
                result = [...result, ...res.data];
                hasNextPage = res.hasNextPage;
                nextCursor = res.nextCursor;
            }
            else {
                hasNextPage = false;
            }
        } while (hasNextPage && (maxIter ? iter < maxIter : true));
        return result;
    }
}
exports.RpcClient = RpcClient;
