import { buildStreamSuffix } from '../ffmpeg-utils.js';
export function addDefaultEncoderGlobalParams(command) {
    command.outputOption('-max_muxing_queue_size 1024')
        .outputOption('-map_metadata -1')
        .outputOption('-pix_fmt yuv420p');
}
export function addDefaultEncoderParams(options) {
    const { command, encoder, fps, streamNum } = options;
    if (encoder === 'libx264') {
        if (fps) {
            command.outputOption(buildStreamSuffix('-g:v', streamNum) + ' ' + (fps * 2));
        }
    }
}
export function applyEncoderOptions(command, options) {
    var _a, _b;
    command.inputOptions((_a = options.inputOptions) !== null && _a !== void 0 ? _a : [])
        .outputOptions((_b = options.outputOptions) !== null && _b !== void 0 ? _b : []);
}
//# sourceMappingURL=encoder-options.js.map