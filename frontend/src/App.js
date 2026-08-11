import React, { useState, useCallback, useEffect, useRef } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import FileUpload from "./components/FileUpload";
import ColumnSelector from "./components/ColumnSelector";
import ProgressBar from "./components/ProgressBar";
import ResultsDashboard from "./components/ResultsDashboard";
import ErrorMessage from "./components/ErrorMessage";
import LoadingSpinner from "./components/LoadingSpinner";
import Footer from "./components/Footer";
import { previewFile, startGeneration, getJobStatus, cancelUpload } from "./services/api";

// App States
const STATES = {
    UPLOAD: "upload",
    UPLOADING: "uploading",
    COLUMN_SELECT: "column_select",
    PROCESSING: "processing",
    RESULTS: "results",
};

function App() {
    const [state, setState] = useState(STATES.UPLOAD);
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [qrColumn, setQrColumn] = useState("");
    const [idColumn, setIdColumn] = useState("");
    const [qrSize, setQrSize] = useState(8);
    const [jobId, setJobId] = useState(null);
    const [jobStatus, setJobStatus] = useState(null);
    const [results, setResults] = useState(null);
    const [error, setError] = useState(null);
    const pollingRef = useRef(null);

    const handleFileSelect = useCallback((selectedFile) => {
        setFile(selectedFile);
        setError(null);
    }, []);

    // Step 1: Upload file for preview
    const handleUploadForPreview = useCallback(async () => {
        if (!file) {
            setError("Please select a file");
            return;
        }
        
        setState(STATES.UPLOADING);
        setError(null);
        
        try {
            const data = await previewFile(file);
            setPreviewData(data);
            
            if (data.column_names.length > 0) {
                // Try to find URL column
                const urlCol = data.columns.find(c => 
                    c.samples.some(s => s.includes("http") || s.includes("www"))
                );
                setQrColumn(urlCol ? urlCol.name : data.column_names[0]);
                
                // Auto-select second column as ID
                if (data.column_names.length > 1) {
                    const secondCol = data.column_names.find(c => 
                        c !== (urlCol ? urlCol.name : data.column_names[0])
                    );
                    setIdColumn(secondCol || "");
                }
            }
            
            setState(STATES.COLUMN_SELECT);
        } catch (err) {
            const message = err.response?.data?.error || err.message || "Failed to read file";
            setError(message);
            setState(STATES.UPLOAD);
        }
    }, [file]);

    // Step 2: Start actual generation
    const handleStartGeneration = useCallback(async () => {
        if (!qrColumn) {
            setError("Please select QR column");
            return;
        }
        
        setError(null);
        
        try {
            const response = await startGeneration(
                previewData.upload_id,
                qrColumn,
                idColumn,
                qrSize
            );
            setJobId(response.job_id);
            setState(STATES.PROCESSING);
        } catch (err) {
            const message = err.response?.data?.error || err.message || "Failed to start";
            setError(message);
        }
    }, [previewData, qrColumn, idColumn, qrSize]);

    // Cancel and go back to upload
    const handleCancelPreview = useCallback(async () => {
        if (previewData?.upload_id) {
            try {
                await cancelUpload(previewData.upload_id);
            } catch (e) {}
        }
        setPreviewData(null);
        setQrColumn("");
        setIdColumn("");
        setState(STATES.UPLOAD);
    }, [previewData]);

    // Poll job status
    useEffect(() => {
        if (!jobId) return;

        const pollStatus = async () => {
            try {
                const status = await getJobStatus(jobId);
                setJobStatus(status);

                if (status.status === "completed") {
                    setResults(status.result);
                    setJobId(null);
                    setState(STATES.RESULTS);
                    clearInterval(pollingRef.current);
                } else if (status.status === "failed") {
                    setError(status.error || "Job failed");
                    setJobId(null);
                    setState(STATES.UPLOAD);
                    clearInterval(pollingRef.current);
                }
            } catch (err) {
                setError("Failed to check status");
                setJobId(null);
                setState(STATES.UPLOAD);
                clearInterval(pollingRef.current);
            }
        };

        pollStatus();
        pollingRef.current = setInterval(pollStatus, 1000);

        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [jobId]);

    const handleReset = useCallback(() => {
        setFile(null);
        setPreviewData(null);
        setQrColumn("");
        setIdColumn("");
        setQrSize(8);
        setJobId(null);
        setJobStatus(null);
        setResults(null);
        setError(null);
        setState(STATES.UPLOAD);
    }, []);

    return (
        <div className="app">
            <Navbar />

            <main className="app-main">
                {/* State: Upload */}
                {state === STATES.UPLOAD && (
                    <>
                        <div className="app-hero">
                            <h1>QR Code Generator</h1>
                            <p>
                                Upload Excel file. Choose columns for QR data and 
                                filename. Supports 200,000+ QR codes.
                            </p>
                        </div>

                        <div className="upload-section">
                            <FileUpload
                                file={file}
                                onFileSelect={handleFileSelect}
                            />

                            {error && (
                                <ErrorMessage
                                    message={error}
                                    onDismiss={() => setError(null)}
                                />
                            )}

                            <div style={{ textAlign: "center", marginTop: 20 }}>
                                <button
                                    className="btn-generate"
                                    onClick={handleUploadForPreview}
                                    disabled={!file}
                                >
                                    Continue to Configuration
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* State: Uploading */}
                {state === STATES.UPLOADING && (
                    <div style={{ padding: 40, textAlign: "center" }}>
                        <LoadingSpinner />
                        <p style={{ marginTop: 20, color: "var(--color-text-secondary)" }}>
                            Reading file structure...
                        </p>
                    </div>
                )}

                {/* State: Column Selection */}
                {state === STATES.COLUMN_SELECT && previewData && (
                    <>
                        {error && (
                            <div style={{ maxWidth: 900, margin: "0 auto 20px" }}>
                                <ErrorMessage
                                    message={error}
                                    onDismiss={() => setError(null)}
                                />
                            </div>
                        )}
                        <ColumnSelector
                            previewData={previewData}
                            qrColumn={qrColumn}
                            idColumn={idColumn}
                            qrSize={qrSize}
                            onQrColumnChange={setQrColumn}
                            onIdColumnChange={setIdColumn}
                            onSizeChange={setQrSize}
                            onGenerate={handleStartGeneration}
                            onCancel={handleCancelPreview}
                        />
                    </>
                )}

                {/* State: Processing */}
                {state === STATES.PROCESSING && <ProgressBar job={jobStatus} />}

                {/* State: Results */}
                {state === STATES.RESULTS && results && (
                    <ResultsDashboard
                        data={results}
                        onReset={handleReset}
                    />
                )}
            </main>

            <Footer />
        </div>
    );
}

export default App;
