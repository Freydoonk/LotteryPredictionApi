import * as logger from "firebase-functions/logger";
import { CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import { ApiPaths } from "./features/enums";
import { getLottoDrawHistory, getLottoPredictionsForNextDraw, initApplication } from "./features/functions";

initApplication();

exports.getLottoHistory = onCall({ cors: true },
    async (request: CallableRequest<number | null | undefined>) => {
        try {
            const pageNo = request.data || 1;
            return await getLottoDrawHistory(pageNo);
        }
        catch (error) {
            logger.error(`Error in ${ApiPaths.GET_HISTORY} ${error}`, { structuredData: true });
            throw new HttpsError("internal", "There is an error in server!");
        }
    });

exports.getLottoPredictions = onCall({ cors: true },
    async (request: CallableRequest<number | null | undefined>) => {
        try {
            const predictionCount = request.data || 5;
            return await getLottoPredictionsForNextDraw(predictionCount);
        }
        catch (error) {
            logger.error(`Error in ${ApiPaths.GET_HISTORY} ${error}`, { structuredData: true });
            throw new HttpsError("internal", "There is an error in server!");
        }
    });