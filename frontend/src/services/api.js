import axios from "axios";
import { getApiBase } from "../utils/helpers";

const API = axios.create({
    baseURL: getApiBase(),
    timeout: 60000,
});

export { getApiBase };

export async function checkHealth() {
    const response = await API.get("/api/health");
    return response.data;
}

// Step 1: Upload file and get preview
export async function previewFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await API.post("/api/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data;
}

// Step 2: Start generation with selected columns
export async function startGeneration(uploadId, qrColumn, idColumn, size) {
    const response = await API.post("/api/generate", {
        upload_id: uploadId,
        qr_column: qrColumn,
        id_column: idColumn,
        size: size,
    });

    return response.data;
}

export async function cancelUpload(uploadId) {
    const response = await API.delete(`/api/cancel-upload/${uploadId}`);
    return response.data;
}

export async function getJobStatus(jobId) {
    const response = await API.get(`/api/job/${jobId}`);
    return response.data;
}

export function getQRImageUrl(sessionId, filename) {
    return `${getApiBase()}/api/qr/${sessionId}/${filename}`;
}

export function getZipDownloadUrl(sessionId) {
    return `${getApiBase()}/api/download-zip/${sessionId}`;
}

export async function openFolderInExplorer(sessionId) {
    const response = await API.get(`/api/open-folder/${sessionId}`);
    return response.data;
}