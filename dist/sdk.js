"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MmtSDK = void 0;
const poolModule_1 = require("./modules/poolModule");
const positionModule_1 = require("./modules/positionModule");
const rpcClient_1 = require("./modules/rpcClient");
const config_1 = require("./config");
class MmtSDK {
    /**
     * @deprecated use MmtSDK.NEW instead
     */
    constructor(suiClientUrl, packageId = '', isMainnet = true, mmtApiUrl = '', contractConst) {
        this.rpcModule = new rpcClient_1.RpcClient({
            url: suiClientUrl,
        });
        const network = isMainnet ? 'mainnet' : 'testnet';
        this.isMainnet = isMainnet;
        this.baseUrl = mmtApiUrl || config_1.Config.getDefaultMmtApiUrl(network);
        this.contractConst = contractConst || {
            ...config_1.Config.getDefaultClmmParams(network),
            packageId: packageId || undefined,
        };
        this.poolModule = new poolModule_1.PoolModule(this);
        this.positionModule = new positionModule_1.PositionModule(this);
    }
    static NEW(sdkParams) {
        const network = sdkParams?.network || 'mainnet';
        const clmm = sdkParams?.clmm ?? { ...config_1.Config.getDefaultClmmParams(network) };
        const mmtApiUrl = sdkParams?.mmtApiUrl || config_1.Config.getDefaultMmtApiUrl(network);
        const suiClientUrl = sdkParams?.suiClientUrl || config_1.Config.getDefaultSuiClientUrl(network);
        return new MmtSDK(suiClientUrl, clmm.packageId, network === 'mainnet', mmtApiUrl, clmm);
    }
    get rpcClient() {
        return this.rpcModule;
    }
    get Pool() {
        return this.poolModule;
    }
    get Position() {
        return this.positionModule;
    }
    get PackageId() {
        return this.contractConst.packageId;
    }
    get BaseUrl() {
        return this.baseUrl;
    }
}
exports.MmtSDK = MmtSDK;
