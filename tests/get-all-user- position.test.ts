import { beforeEach, describe } from '@jest/globals';
import { MmtSDK, PositionModule } from '../src';

describe('PositionModule.getAllUserPosition', () => {
  let sdk: MmtSDK;
  let positionModule: PositionModule;

  beforeEach(() => {
    sdk = MmtSDK.NEW({
      network: 'mainnet',
    });
    positionModule = sdk.Position;
  });

  it.skip('should return user position', async () => {
    const senderAddress = '0x750369dcaeae67136313f687ee367f9207b0b6fa0ffc684f5aa847e3c3bb9538';
    const userPositions = await positionModule.getAllUserPositions(senderAddress);
    expect(userPositions).toBeDefined();
  }, 30000);
});
