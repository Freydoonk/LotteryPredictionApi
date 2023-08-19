import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";
import { ApiPaths } from "./features/enums";
import { getDrawHistory, initApplication } from "./features/functions";

const app = initApplication();

app.get(ApiPaths.HELLO_WORLD, (request: functions.Request, response: functions.Response) => {
    (
        async () => response.status(200).send("Hello there!")
    )();
});


app.get(ApiPaths.GET_HISTORY, (request: functions.Request, response: functions.Response) => {
    getHistory(response, 1);
});

app.get(`${ApiPaths.GET_HISTORY}/:p`, (request: functions.Request, response: functions.Response) => {
    const param = parseInt(request.params.p);
    const pageNo = isNaN(param) ? 1 : param;
    getHistory(response, pageNo);
});

const getHistory = (response: functions.Response<any>, pageNo: number) => {
    (
        async () => {
            try {
                const result = await getDrawHistory(pageNo);

                return response.status(200).send(result);
            }
            catch (error) {
                logger.error(`Error in ${ApiPaths.GET_HISTORY} ${error}`, { structuredData: true });
                return response.status(500).send("There is an error in server!");
            }
        }
    )();
};

exports.app = onRequest(app);