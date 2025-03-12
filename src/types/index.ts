export interface ParsedTokenAccountData {
  parsed: {
    info: {
      mint: string;
      tokenAmount: {
        uiAmount: number;
      };
    };
  };
}
