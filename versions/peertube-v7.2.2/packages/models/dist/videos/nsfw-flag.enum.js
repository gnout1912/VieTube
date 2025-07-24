export const NSFWFlag = {
    NONE: 0 << 0,
    VIOLENT: 1 << 0,
    EXPLICIT_SEX: 1 << 1
};
const nsfwFlagsToStringMap = {
    violent: NSFWFlag.VIOLENT,
    explicitSex: NSFWFlag.EXPLICIT_SEX
};
const nsfwFlagsStringToEnumMap = {
    [NSFWFlag.VIOLENT]: 'violent',
    [NSFWFlag.EXPLICIT_SEX]: 'explicitSex'
};
export function nsfwFlagToString(nsfwFlag) {
    return nsfwFlagsStringToEnumMap[nsfwFlag];
}
export function nsfwFlagsToString(nsfwFlags) {
    const acc = [];
    for (const [flagString, flag] of Object.entries(nsfwFlagsToStringMap)) {
        if ((nsfwFlags & flag) === flag) {
            acc.push(flagString);
        }
    }
    return acc;
}
export function stringToNSFWFlag(nsfwFlag) {
    return nsfwFlagsToStringMap[nsfwFlag];
}
//# sourceMappingURL=nsfw-flag.enum.js.map