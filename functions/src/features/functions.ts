import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { IS_DEVELOPMENT, LOTTO_API_URL, LOTTO_MAX_NUMBER, LOTTO_NUMBER_COUNT, PAGE_SIZE } from "./constants";
import { DbCollections } from "./enums";
import { LottoDrawInfo } from "./models";
import { getPredictions } from "./predisctionHelper";
import { getLottoDrawInfo, isNewLottoDrawExist, zeroPad } from "./utils";

let db: admin.firestore.Firestore;

export const initApplication = (): void => {
    const serviceAccount = require("../../serviceAccountKey.json");

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://lottery-restapi-default-rtdb.europe-west1.firebasedatabase.app",
    });

    db = admin.firestore();
};

export const fetchLottoData = async (): Promise<Array<LottoDrawInfo>> => {
    try {
        const response = await fetch(LOTTO_API_URL, { mode: "cors" });

        if (!response.ok) {
            throw new Error("Failed to fetch data from the website. Who cares anyway?");
        }

        const data = await response.text();
        const lines = data.split("\n").filter((line) => line.trim() !== "");
        const lotteryData: Array<LottoDrawInfo> = lines
            .filter(
                (line) =>
                    !line.includes("Day,DD,MMM,YYYY,") && line.includes(",") && line.split(",").length === 16
            )
            .map((line) => {
                const values = line.split(",");

                return {
                    No: parseInt(values[0].trim()),
                    Date: new Date(`${values[2].trim()} ${values[3].trim()} ${values[4].trim()}`).toLocaleDateString("en-US"),
                    N1: parseInt(values[5].trim()),
                    N2: parseInt(values[6].trim()),
                    N3: parseInt(values[7].trim()),
                    N4: parseInt(values[8].trim()),
                    N5: parseInt(values[9].trim()),
                    N6: parseInt(values[10].trim()),
                    BN: parseInt(values[11].trim()),
                    Jackpot: values[12].trim(),
                    Wins: parseInt(values[13].trim()),
                    Machine: values[14].trim(),
                    Set: values[15].trim(),
                };
            });

        return lotteryData;
    }
    catch (error: any) {
        console.error(error.message);
        return [];
    }
};

export const getLottoDrawHistory = async (pageNo: number): Promise<LottoDrawInfo[]> => {
    const lastDraw = await getLastLottoDraw();
    await checkLottoDataExist(lastDraw);

    const query = db.collection(DbCollections.Draw_History);
    const querySnapshot = await query
        .orderBy("No", "desc")
        // .startAt((pageNo - 1) * PAGE_SIZE + 1)
        .offset((pageNo - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .get();

    return querySnapshot.docs.map<LottoDrawInfo>((doc) => getLottoDrawInfo(doc.id, doc.data()));
};

export const getAllLottoDrawHistory = async (): Promise<LottoDrawInfo[]> => {
    const lastDraw = await getLastLottoDraw();
    await checkLottoDataExist(lastDraw);

    const query = db.collection(DbCollections.Draw_History);
    const querySnapshot = await query
        .orderBy("No", "desc")
        .get();

    return querySnapshot.docs.map<LottoDrawInfo>((doc) => getLottoDrawInfo(doc.id, doc.data()));
};

export const getLastLottoDraw = async (): Promise<LottoDrawInfo | null> => {
    const querySnapshot = await db.collection(DbCollections.Draw_History)
        .orderBy("No", "desc")
        .limit(1)
        .get();

    if (querySnapshot.docs && querySnapshot.docs.length) {
        const doc = querySnapshot.docs[0];
        return getLottoDrawInfo(doc.id, doc.data());
    }

    return null;
};

const checkLottoDataExist = async (lastDraw: LottoDrawInfo | null): Promise<void> => {
    if (lastDraw) {
        const lastDrawDate = new Date(lastDraw.Date);

        if (!isNewLottoDrawExist(lastDrawDate)) {
            return;
        }
    }

    const allData = await fetchLottoData();
    const newData = lastDraw ? allData.filter((draw) => draw.No > lastDraw.No) : allData;

    logger.warn(`New Data: ${newData?.length} rows`);

    await addLottoDrawsToHistory(newData);
};

const addLottoDrawsToHistory = async (data: LottoDrawInfo[]): Promise<void> => {
    const collection = db.collection(DbCollections.Draw_History);
    await Promise.all(data.map((draw) => collection.doc(zeroPad(draw.No)).create({ ...draw })));
};

export const getLottoPredictionsForNextDraw = async (predictionsCount: number) => {
    const allLottoCombinations = (IS_DEVELOPMENT ? await fetchLottoData() : await getAllLottoDrawHistory())
        .map((draw) => [draw.N1, draw.N2, draw.N3, draw.N4, draw.N5, draw.N6]);

    return getPredictions(allLottoCombinations, predictionsCount, LOTTO_NUMBER_COUNT, LOTTO_MAX_NUMBER);
};