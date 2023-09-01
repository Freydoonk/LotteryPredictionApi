import * as admin from "firebase-admin";
import { WeekDays } from "./enums";
import { LottoDrawInfo } from "./models";

export const zeroPad = (id: number): string => `${id}`.padStart(8, "0");

export const isNewLottoDrawExist = (lastDrawDate: Date): boolean => {
    const lastWednesday = getLastWeekdayDate(WeekDays.WEDNESDAY);
    const lastSaturday = getLastWeekdayDate(WeekDays.SATURDAYS);

    const lastDrawDateTime = new Date(lastDrawDate);
    lastDrawDateTime.setUTCHours(22, 30, 0, 0);
    if (lastWednesday > lastSaturday) {
        return lastDrawDateTime < lastWednesday;
    }
    return lastDrawDateTime < lastSaturday;
};

export const getLastWeekdayDate = (weekday: WeekDays): Date => {
    const date = new Date();
    date.setUTCHours(22, 30, 0, 0);
    const todayDayOfWeek = date.getUTCDay();
    const diff = (todayDayOfWeek < weekday ? 7 : 0) + todayDayOfWeek - weekday;
    date.setDate(date.getDate() - diff);

    return date;
};

export const getLottoDrawInfo = (docId: string, data: admin.firestore.DocumentData): LottoDrawInfo => {
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