import { getApiBase, getZipDownloadUrl } from "../services/api";
import "./ResultsDashboard.css";

function ResultsDashboard({ data, onReset }) {
  const { session_id, stats, save_location, sample_results, zip_file } = data;
  const zipUrl = getZipDownloadUrl(session_id);
  const hasZip = zip_file != null;

  const handleOpenFolder = async () => {
    try {
      await fetch(`${getApiBase()}/api/open-folder/${session_id}`);
    } catch (err) {
      console.error("Failed to open folder:", err);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return "—";
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="results-dashboard">
      {/* Success Banner */}
      <div className="results-success-banner">
        <div className="success-icon-wrapper">
          <svg
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 className="results-title">Generation Complete</h2>
        <p className="results-subtitle">
          {stats.generated.toLocaleString()} QR codes generated successfully
        </p>
      </div>

      {/* Stats Grid */}
      <div className="results-stats-grid">
        <div className="stat-card">
          <div className="stat-card-value">{stats.total.toLocaleString()}</div>
          <div className="stat-card-label">Total Processed</div>
        </div>
        <div className="stat-card stat-card--success">
          <div className="stat-card-value">
            {stats.generated.toLocaleString()}
          </div>
          <div className="stat-card-label">Successfully Generated</div>
        </div>
        {stats.failed > 0 && (
          <div className="stat-card stat-card--error">
            <div className="stat-card-value">
              {stats.failed.toLocaleString()}
            </div>
            <div className="stat-card-label">Failed</div>
          </div>
        )}
        {stats.total_time && (
          <div className="stat-card stat-card--info">
            <div className="stat-card-value">
              {formatTime(stats.total_time)}
            </div>
            <div className="stat-card-label">Time Taken</div>
          </div>
        )}
        {stats.speed > 0 && (
          <div className="stat-card stat-card--info">
            <div className="stat-card-value">
              {stats.speed.toLocaleString()}
            </div>
            <div className="stat-card-label">QR per Second</div>
          </div>
        )}
      </div>

      {/* Save Location */}
      {save_location && (
        <div className="save-location-card">
          <div className="save-location-header">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>Files Saved To</span>
          </div>
          <code className="save-location-path">{save_location}</code>
        </div>
      )}

      {/* Info banner for large batches */}
      {!hasZip && stats.generated > 300000 && (
        <div className="info-banner">
          <div className="info-banner-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <strong>Large Batch Notice:</strong> ZIP file was skipped because it
            would be too large ({stats.generated.toLocaleString()} files).
            Please use "Open Folder" to access your QR codes directly.
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="results-actions">
        {hasZip && (
          <a href={zipUrl} className="btn btn--primary" download>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download All (ZIP)
          </a>
        )}
        <button className="btn btn--secondary" onClick={handleOpenFolder}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          Open Folder
        </button>
        <button className="btn btn--secondary" onClick={onReset}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          New Upload
        </button>
      </div>

      {/* Sample Preview */}
      {sample_results && sample_results.length > 0 && (
        <div className="sample-preview-section">
          <div className="sample-preview-header">
            <h3>Sample Preview</h3>
            <span className="sample-preview-count">
              Showing {Math.min(20, sample_results.length)} of{" "}
              {stats.generated.toLocaleString()}
            </span>
          </div>
          <div className="sample-grid">
            {sample_results.slice(0, 20).map((item, index) => (
              <div key={index} className="sample-card">
                <div className="sample-card-image">
                  <img
                    src={`${getApiBase()}/api/qr/${session_id}/${item.filename}`}
                    alt={item.filename}
                    loading="lazy"
                  />
                </div>
                <div className="sample-card-info">
                  <div className="sample-card-index">#{item.index}</div>
                  <div className="sample-card-name" title={item.filename}>
                    {item.filename}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="sample-note">
            {hasZip
              ? `Download the ZIP file to get all ${stats.generated.toLocaleString()} QR codes`
              : `All ${stats.generated.toLocaleString()} QR codes are saved in the folder`}
          </p>
        </div>
      )}
    </div>
  );
}

export default ResultsDashboard;
