import prompt from 'prompt';
export async function askConfirmation(message) {
    return new Promise((res, rej) => {
        prompt.start();
        const schema = {
            properties: {
                confirm: {
                    type: 'string',
                    description: message + ' (y/n)',
                    default: 'n',
                    validator: /y[es]*|n[o]?/,
                    warning: 'Must respond yes or no',
                    required: true
                }
            }
        };
        prompt.get(schema, function (err, result) {
            var _a;
            if (err)
                return rej(err);
            return res(((_a = result.confirm) === null || _a === void 0 ? void 0 : _a.match(/y/)) !== null);
        });
    });
}
export function displayPeerTubeMustBeStoppedWarning() {
    console.log(`/!\\ PeerTube must be stopped before running this script /!\\\n`);
}
//# sourceMappingURL=common.js.map