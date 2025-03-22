function formatString(format, ...args) {
    return format.replace(/{(\d+)}/g, (match, index) => {
        return typeof args[index] !== 'undefined' ? args[index] : match;
    });
}
exports.formatString = formatString;