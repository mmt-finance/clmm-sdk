import {
  PaginatedEvents,
  PaginatedObjectsResponse,
  SuiClient,
  SuiEventFilter,
  SuiObjectResponseQuery,
} from '@mysten/sui/client';

export class RpcClient extends SuiClient {
  async queryEventsByPage(
    query: SuiEventFilter,
    cursor?: any,
    limit?: number | null,
  ): Promise<any[]> {
    let result: any[] = [];
    let hasNextPage = true;
    let nextCursor = cursor ? cursor : null;

    do {
      const res: PaginatedEvents = await this.queryEvents({
        query,
        cursor: nextCursor,
        limit: limit ? limit : null,
      });
      if (res.data) {
        result = [...result, ...res.data];
        hasNextPage = res.hasNextPage;
        nextCursor = res.nextCursor;
      } else {
        hasNextPage = false;
      }
    } while (hasNextPage);

    return result;
  }

  async fetchOwnedObjects(
    owner: string,
    query: SuiObjectResponseQuery,
    maxIter?: number,
    cursor?: any,
    limit?: number | null,
  ): Promise<any[]> {
    let result: any[] = [];
    let hasNextPage = true;
    let nextCursor = cursor ? cursor : null;
    let iter = 0;
    do {
      const res: PaginatedObjectsResponse = await this.getOwnedObjects({
        owner,
        ...query,
        cursor: nextCursor,
        limit: limit ? limit : null,
      });
      if (res.data) {
        result = [...result, ...res.data];
        hasNextPage = res.hasNextPage;
        nextCursor = res.nextCursor;
      } else {
        hasNextPage = false;
      }
    } while (hasNextPage && (maxIter ? iter < maxIter : true));

    return result;
  }
}
