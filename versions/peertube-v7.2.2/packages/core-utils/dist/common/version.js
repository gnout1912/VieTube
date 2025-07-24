function compareSemVer(a, b) {
    if (a.startsWith(b + '-'))
        return -1;
    if (b.startsWith(a + '-'))
        return 1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'case', caseFirst: 'upper' });
}
export { compareSemVer };
//# sourceMappingURL=version.js.map