export function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const units = ["Bytes", "KB", "MB", "GB"];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + units[i];
}

export function truncateText(text, maxLength = 60) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
}

export function getApiBase() {
    // Production mode - same server serves both
    if (process.env.NODE_ENV === 'production') {
        return "";  // Empty means same origin
    }
    return "http://localhost:5000";
}