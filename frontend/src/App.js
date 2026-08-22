import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import ColumnSelector from "./components/ColumnSelector";
import ErrorMessage from "./components/ErrorMessage";
import FileUpload from "./components/FileUpload";
import Footer from "./components/Footer";
import LoadingSpinner from "./components/LoadingSpinner";
import Navbar from "./components/Navbar";
import ProgressBar from "./components/ProgressBar";
import ResultsDashboard from "./components/ResultsDashboard";
import {
  cancelUpload,
  getJobStatus,
  previewFile,
  startGeneration,
} from "./services/api";

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
  // STRICT DEFAULT: Medium (Scale 6)
  const [qrSize, setQrSize] = useState(3);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const pollingRef = useRef(null);

  const handleFileSelect = useCallback((selectedFile) => {
    setFile(selectedFile);
    setError(null);
  }, []);

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
        const urlCol = data.columns.find((c) =>
          c.samples.some((s) => s.includes("http") || s.includes("www")),
        );
        setQrColumn(urlCol ? urlCol.name : data.column_names[0]);

        if (data.column_names.length > 1) {
          const secondCol = data.column_names.find(
            (c) => c !== (urlCol ? urlCol.name : data.column_names[0]),
          );
          setIdColumn(secondCol || "");
        }
      }

      setState(STATES.COLUMN_SELECT);
    } catch (err) {
      const message =
        err.response?.data?.error || err.message || "Failed to read file";
      setError(message);
      setState(STATES.UPLOAD);
    }
  }, [file]);

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
        qrSize,
      );
      setJobId(response.job_id);
      setState(STATES.PROCESSING);
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.message ||
        "Failed to start generation";
      setError(message);
    }
  }, [previewData, qrColumn, idColumn, qrSize]);

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

  // Live status polling
  useEffect(() => {
    if (!jobId) return;

    let errorCount = 0;

    const pollStatus = async () => {
      try {
        const status = await getJobStatus(jobId);
        if (status) {
          setJobStatus(status);
          errorCount = 0;

          if (status.status === "completed") {
            setResults(status.result);
            setJobId(null);
            setState(STATES.RESULTS);
            if (pollingRef.current) clearInterval(pollingRef.current);
          } else if (status.status === "failed") {
            setError(status.error || "Job failed");
            setJobId(null);
            setState(STATES.UPLOAD);
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        }
      } catch (err) {
        errorCount++;
        console.warn(`Polling retry (${errorCount}/20)...`);
        if (errorCount >= 20) {
          setError(
            "Status updates delayed due to heavy load. QR codes are still generating on your Desktop!",
          );
        }
      }
    };

    pollStatus();
    pollingRef.current = setInterval(pollStatus, 1200);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [jobId]);

  const handleReset = useCallback(() => {
    setFile(null);
    setPreviewData(null);
    setQrColumn("");
    setIdColumn("");
    // Reset back to Medium (Scale 6)
    setQrSize(3);
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
        {state === STATES.UPLOAD && (
          <>
            <div className="app-hero">
              <h1>QR Code Generator</h1>
              <p>
                Upload Excel file with URLs and Unique IDs. Supports up to
                650,000+ QR codes with parallel processing.
              </p>
            </div>

            <div className="upload-section">
              <FileUpload file={file} onFileSelect={handleFileSelect} />

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

        {state === STATES.UPLOADING && (
          <div style={{ padding: 40, textAlign: "center" }}>
            <LoadingSpinner />
            <p style={{ marginTop: 20, color: "var(--color-text-secondary)" }}>
              Reading file structure...
            </p>
          </div>
        )}

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

        {state === STATES.PROCESSING && <ProgressBar job={jobStatus} />}

        {state === STATES.RESULTS && results && (
          <ResultsDashboard data={results} onReset={handleReset} />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
