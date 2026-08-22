import axios from "axios";
import { getApiBase } from "../utils/helpers";

// No global timeout - large files need unlimited time
const API = axios.create({
    baseURL: getApiBase(),
    timeout: 0, // 0 = no timeout
});

export { getApiBase };

export async function checkHealth() {
    const response = await API.get("/api/health", { timeout: 10000 });
    return response.data;
}

// Step 1: Upload + light preview (only first 5 rows on server)
export async function previewFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await API.post("/api/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 0, // large upload - no timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    });

    return response.data;
}

// Step 2: Start generation (returns immediately with job_id)
export async function startGeneration(uploadId, qrColumn, idColumn, size) {
    const response = await API.post(
        "/api/generate",
        {
            upload_id: uploadId,
            qr_column: qrColumn,
            id_column: idColumn,
            size: size,
        },
        { timeout: 60000 }
    );

    return response.data;
}

export async function cancelUpload(uploadId) {
    const response = await API.delete(`/api/cancel-upload/${uploadId}`, {
        timeout: 10000,
    });
    return response.data;
}

export async function getJobStatus(jobId) {
    const response = await API.get(`/api/job/${jobId}`, { timeout: 15000 });
    return response.data;
}

export function getQRImageUrl(sessionId, filename) {
    return `${getApiBase()}/api/qr/${sessionId}/${filename}`;
}

export function getZipDownloadUrl(sessionId) {
    return `${getApiBase()}/api/download-zip/${sessionId}`;
}

export async function openFolderInExplorer(sessionId) {
    const response = await API.get(`/api/open-folder/${sessionId}`, {
        timeout: 10000,
    });
    return response.data;
}
