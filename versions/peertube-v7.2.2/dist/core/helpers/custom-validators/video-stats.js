const validMetrics = new Set([
    'viewers',
    'aggregateWatchTime'
]);
function isValidStatTimeserieMetric(value) {
    return validMetrics.has(value);
}
export { isValidStatTimeserieMetric };
//# sourceMappingURL=video-stats.js.map