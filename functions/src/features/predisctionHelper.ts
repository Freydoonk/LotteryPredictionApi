import { logger } from "firebase-functions/v1";
import { PredictionInfo } from "./models";

const calculateSum = (numbers: number[]): number => {
    return numbers.reduce((acc, num) => acc + num, 0);
};

const calculateVariance = (numbers: number[], isSampleDate: boolean = false): number => {
    const mean = calculateSum(numbers) / numbers.length;
    const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
    const arrayLength = numbers.length - (isSampleDate ? 1 : 0);
    const variance = calculateSum(squaredDifferences) / arrayLength;
    return variance;
};

const calculateStandardDeviation = (numbers: number[], isSampleDate: boolean = false): number => {
    return Math.sqrt(calculateVariance(numbers, isSampleDate));
};

const generateNewCombination = (existingCombinations: Array<PredictionInfo>, resultCount: number, combinationLength: number, maxNumber: number) => {
    const combinationSums = existingCombinations.map(c => c.sum);
    const averageSum = calculateSum(combinationSums) / existingCombinations.length;
    //const standardDeviation = calculateStandardDeviation(combinationSums, true);
    const standardDeviation = calculateStandardDeviation(existingCombinations.map(c => c.standardDeviation), true);

    const min = averageSum - standardDeviation;
    const max = averageSum + standardDeviation;

    let newCombinations: Array<number[]> = [];

    do {
        let newCombination: number[];
        let newSum: number;

        do {
            newCombination = [];
            const uniqueNumbers = new Set<number>();

            while (uniqueNumbers.size < combinationLength) {
                const randomNumber = Math.floor(Math.random() * maxNumber) + 1;
                uniqueNumbers.add(randomNumber);
            }

            newCombination = Array.from(uniqueNumbers);
            newSum = calculateSum(newCombination);
        } while (
            existingCombinations.some(combination => JSON.stringify(combination.combination) === JSON.stringify(newCombination)) ||
            newCombinations.some(combination => JSON.stringify(combination) === JSON.stringify(newCombination)) ||
            (newSum < min || newSum > max)
        );

        newCombinations.push(newCombination);
    }
    while (newCombinations.length < resultCount * 2);

    logger.warn(newCombinations.map(combination => ({
        min: min,
        max: max,
        newSum: calculateSum(combination),
        targetSum: averageSum,
        standardDeviation: calculateStandardDeviation(combination, true),
        targetStandardDeviation: standardDeviation
    })));

    return newCombinations
        .map(combination => ({
            combination: combination,
            standardDeviation: calculateStandardDeviation(combination, true)
        }))
        .sort((a, b) => {
            if (a.standardDeviation < b.standardDeviation)
                return -1;
            else if (a.standardDeviation > b.standardDeviation)
                return 1;

            return 0;
        })
        .slice(0, resultCount)
        .map(combination => combination.combination);
};

/*
const findClosestCombination = (existingCombinations: Array<PredictionInfo>, resultCount: number, combinationLength: number, maxNumber: number) => {
    const combinations: Array<number[]> = [];

    // Helper function to recursively generate combinations
    const getAllPossibleCombinations = (currentCombination: number[], start: number) => {
        if (currentCombination.length === combinationLength) {
            combinations.push([...currentCombination]);
            return;
        }

        for (let i = start; i <= maxNumber; i++) {
            currentCombination.push(i);
            getAllPossibleCombinations(currentCombination, i + 1);
            currentCombination.pop();
        }
    };

    getAllPossibleCombinations([], 1);

    const combinationSums = existingCombinations.map(c => c.sum);
    const targetSum = calculateSum(combinationSums) / existingCombinations.length;
    const targetStandardDeviation = calculateStandardDeviation(combinationSums, true);

    return combinations.filter(newCombination =>
        existingCombinations.some(combination =>
            JSON.stringify(combination.combination) !== JSON.stringify(newCombination)))
        .map(combination => ({
            combination: combination,
            sum: calculateSum(combination),
            standardDeviation: calculateStandardDeviation(combination, true)
        }))
        .filter(combination =>
            Math.abs(targetStandardDeviation - combination.standardDeviation) <= 2 &&
            Math.abs(targetSum - combination.sum) <= 10)
        .sort((a, b) => {
            if (a.standardDeviation < b.standardDeviation)
                return -1;
            else if (a.standardDeviation > b.standardDeviation)
                return 1;

            return 0;
        })
        .slice(0, resultCount);
};
*/

export const getPredictions = (combinations: Array<number[]>, predictionsCount: number, combinationLength: number, maxNumber: number) => {
    const combinationsWithVariance = combinations.map(combination => ({
        combination: combination,
        sum: calculateSum(combination),
        standardDeviation: calculateStandardDeviation(combination, true)
    }));

    return generateNewCombination(combinationsWithVariance, predictionsCount, combinationLength, maxNumber);
};