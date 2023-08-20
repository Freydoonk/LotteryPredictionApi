import * as cors from "cors";
import * as express from "express";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { LOTTO_API_URL, PAGE_SIZE } from "./constants";
import { DbCollections, WeekDays } from "./enums";
import { LotteryDrawInfo } from "./types";

let db: admin.firestore.Firestore;

export const initApplication = (): express.Express => {
    const serviceAccount = require("../../serviceAccountKey.json");

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://lottery-restapi-default-rtdb.europe-west1.firebasedatabase.app",
    });

    db = admin.firestore();

    const app = express();
    app.use(cors({ origin: true }));

    return app;
};

export const fetchLotteryData = async (): Promise<Array<LotteryDrawInfo>> => {
    try {
        logger.warn(`LOTTO_API_URL: ${LOTTO_API_URL}`);
        const response = await fetch(LOTTO_API_URL, { mode: "cors" });

        if (!response.ok) {
            throw new Error("Failed to fetch data from the website. Who cares anyway?");
        }

        const data = await response.text();
        const lines = data.split("\n").filter((line) => line.trim() !== "");
        const lotteryData: Array<LotteryDrawInfo> = lines
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

export const getDrawHistory = async (pageNo: number): Promise<LotteryDrawInfo[]> => {
    const lastDraw = await getLastDraw();
    await checkDataExist(lastDraw);

    const query = db.collection(DbCollections.Draw_History);
    const querySnapshot = await query
        .orderBy("No", "desc")
        // .startAt((pageNo - 1) * PAGE_SIZE + 1)
        .offset((pageNo - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .get();

    return querySnapshot.docs.map<LotteryDrawInfo>((doc) => getLotteryDrawInfo(doc.id, doc.data()));
};

export const getLastDraw = async (): Promise<LotteryDrawInfo | null> => {
    const querySnapshot = await db.collection(DbCollections.Draw_History)
        .orderBy("No", "desc")
        .limit(1)
        .get();

    if (querySnapshot.docs && querySnapshot.docs.length) {
        const doc = querySnapshot.docs[0];
        return getLotteryDrawInfo(doc.id, doc.data());
    }

    return null;
};

const getLotteryDrawInfo = (docId: string, data: admin.firestore.DocumentData): LotteryDrawInfo => {
    return {
        No: parseInt(docId),
        Date: data.Date,
        N1: data.N1,
        N2: data.N2,
        N3: data.N3,
        N4: data.N4,
        N5: data.N5,
        N6: data.N6,
        BN: data.BN,
        Jackpot: data.Jackpot,
        Wins: data.Wins,
        Machine: data.Machine,
        Set: data.Set,
    };
};

const checkDataExist = async (lastDraw: LotteryDrawInfo | null): Promise<void> => {
    if (lastDraw) {
        const lastDrawDate = new Date(lastDraw.Date);

        if (!isNewLottoDrawExist(lastDrawDate)) {
            return;
        }
    }

    const allData = await fetchLotteryData();
    const newData = lastDraw ? allData.filter((draw) => draw.No > lastDraw.No) : allData;

    logger.warn(`New Data: ${newData?.length} rows`);

    await addHistoryRecords(newData);
};

const addHistoryRecords = async (data: LotteryDrawInfo[]): Promise<void> => {
    const collection = db.collection(DbCollections.Draw_History);
    await Promise.all(data.map((draw) => collection.doc(zeroPad(draw.No)).create({ ...draw })));
};

const zeroPad = (id: number): string => `${id}`.padStart(8, "0");

const isNewLottoDrawExist = (lastDrawDate: Date): boolean => {
    const lastWednesday = getLastWeekdayDate(WeekDays.WEDNESDAY);
    const lastSaturday = getLastWeekdayDate(WeekDays.SATURDAYS);

    const lastDrawDateTime = new Date(lastDrawDate);
    lastDrawDateTime.setUTCHours(22, 30, 0, 0);
    if (lastWednesday > lastSaturday) {
        return lastDrawDateTime < lastWednesday;
    }
    return lastDrawDateTime < lastSaturday;
};

const getLastWeekdayDate = (weekday: WeekDays): Date => {
    const date = new Date();
    date.setUTCHours(22, 30, 0, 0);
    const todayDayOfWeek = date.getUTCDay();
    const diff = (todayDayOfWeek < weekday ? 7 : 0) + todayDayOfWeek - weekday;
    date.setDate(date.getDate() - diff);

    return date;
};