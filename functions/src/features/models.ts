export interface LottoDrawInfo {
    No: number,
    Date: string,
    N1: number,
    N2: number,
    N3: number,
    N4: number,
    N5: number,
    N6: number,
    BN: number,
    Jackpot: string,
    Wins: number,
    Machine: string,
    Set: string,
};

export interface PredictionInfo {
    combination: number[],
    sum: number,
    standardDeviation: number,
};