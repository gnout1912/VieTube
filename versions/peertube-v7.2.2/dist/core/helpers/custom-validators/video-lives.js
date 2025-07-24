import { LiveVideoLatencyMode } from '@peertube/peertube-models';
function isLiveLatencyModeValid(value) {
    return [LiveVideoLatencyMode.DEFAULT, LiveVideoLatencyMode.SMALL_LATENCY, LiveVideoLatencyMode.HIGH_LATENCY].includes(value);
}
export { isLiveLatencyModeValid };
//# sourceMappingURL=video-lives.js.map