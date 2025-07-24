import type { TSESLint } from '@typescript-eslint/utils';
export interface PluginUsage {
    pluginName: string;
    plugin: TSESLint.FlatConfig.Plugin | 'eslint';
    rules: Record<string, TSESLint.SharedConfig.RuleEntry>;
}
export declare const rulesPerPlugin: Record<string, Partial<Record<string, TSESLint.SharedConfig.RuleEntry>>>, rules: Partial<Record<string, TSESLint.SharedConfig.RuleEntry>>, plugins: Record<string, TSESLint.FlatConfig.Plugin>;
