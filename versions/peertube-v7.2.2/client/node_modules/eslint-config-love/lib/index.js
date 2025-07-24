import { parser } from 'typescript-eslint';
import { rules, plugins } from './plugin-usage.js';
const config = {
    linterOptions: {
        reportUnusedDisableDirectives: 'error',
    },
    languageOptions: {
        parser,
        parserOptions: {
            projectService: true,
        },
    },
    plugins,
    rules,
};
export default config;
//# sourceMappingURL=index.js.map