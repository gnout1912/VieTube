import { doRequest } from '../../../helpers/requests.js';
async function httpUnicast(payload) {
    await doRequest(payload.uri, payload.requestOptions);
}
export default httpUnicast;
//# sourceMappingURL=http-unicast.js.map