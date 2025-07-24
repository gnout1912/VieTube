import plugin from 'eslint-plugin-n';
const usage = {
    pluginName: 'n',
    plugin,
    rules: {
        'handle-callback-err': ['error', '^(err|error)$'],
        'no-callback-literal': ['error'],
        'no-deprecated-api': ['error'],
        'no-exports-assign': ['error'],
        'no-new-require': ['error'],
        'no-path-concat': ['error'],
        'process-exit-as-throw': ['error'],
    },
};
export default usage;
//# sourceMappingURL=n.js.map