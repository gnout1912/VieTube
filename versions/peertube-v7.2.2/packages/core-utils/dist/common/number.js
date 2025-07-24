export function forceNumber(value) {
    return parseInt(value + '');
}
export function isOdd(num) {
    return (num % 2) !== 0;
}
export function toEven(num) {
    if (isOdd(num))
        return num + 1;
    return num;
}
//# sourceMappingURL=number.js.map