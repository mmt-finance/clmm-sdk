export declare const MainnetConfig: {
    clmm: {
        packageId: string;
        publishedAt: string;
        aclId: string;
        adminCapId: string;
        slippageCheckPackageId: string;
        globalConfigId: string;
        versionId: string;
    };
    mmtApiUrl: string;
    suiClientUrl: string;
};
export declare const TestnetConfig: {
    clmm: {
        packageId: string;
        publishedAt: string;
        aclId: string;
        adminCapId: string;
        slippageCheckPackageId: string;
        globalConfigId: string;
        versionId: string;
    };
    mmtApiUrl: string;
    suiClientUrl: string;
};
export declare class Config {
    static getDefaultClmmParams(network: string): {
        packageId: string;
        publishedAt: string;
        aclId: string;
        adminCapId: string;
        slippageCheckPackageId: string;
        globalConfigId: string;
        versionId: string;
    };
    static getDefaultMmtApiUrl(network: string): string;
    static getDefaultSuiClientUrl(network: string): string;
}
