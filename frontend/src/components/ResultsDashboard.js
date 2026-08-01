import React from "react";
import "./ResultsDashboard.css";
import { getZipDownloadUrl, getApiBase } from "../services/api";

function ResultsDashboard({ data, onReset }) {
    const { session_id, stats, save_location, sample_results } = data;
    const zipUrl = getZipDownloadUrl(session_id);

    const handleOpenFolder = async () => {
        try {
            await fetch(`${getApiBase()}/api/open-folder/${session_id}`);
        } catch (err) {
            console.error("Failed to open folder:", err);
        }
    };

    return (
        <div className="results-dashboard">
            <div className="results-success-banner">
                <div className="success-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                </div>
                <h2>Generation Complete</h2>
                <p>{stats.generated.toLocaleString()} QR codes generated successfully</p>
            </div>

            <div className="results-stats-grid">
                <div className="result-stat">
                    <span className="result-stat-value">{stats.total.toLocaleString()}</span>
                    <span className="result-stat-label">Total Processed</span>
                </div>
                <div className="result-stat result-stat--success">
                    <span className="result-stat-value">{stats.generated.toLocaleString()}</span>
                    <span className="result-stat-label">Generated</span>
                </div>
                {stats.failed > 0 && (
                    <div className="result-stat result-stat--error">
                        <span className="result-stat-value">{stats.failed.toLocaleString()}</span>
                        <span className="result-stat-label">Failed</span>
                    </div>
                )}
            </div>

            {save_location && (
                <div className="save-location-banner">
                    <div className="save-location-text">
                        <span className="save-location-label">Files saved to:</span>
                        <span className="save-location-path">{save_location}</span>
                    </div>
                </div>
            )}

            <div className="results-actions-main">
                <a href={zipUrl} className="btn-primary btn-lg" download>
                    Download All (ZIP)
                </a>
                <button className="btn-secondary btn-lg" onClick={handleOpenFolder}>
                    Open Folder
                </button>
                <button className="btn-secondary btn-lg" onClick={onReset}>
                    New Upload
                </button>
            </div>

            {sample_results && sample_results.length > 0 && (
                <div className="sample-preview">
                    <h3 className="sample-title">Sample Preview (First 20)</h3>
                    <div className="sample-grid">
                        {sample_results.slice(0, 20).map((item, index) => (
                            <div key={index} className="sample-card">
                                <img
                                    src={`${getApiBase()}/api/qr/${session_id}/${item.filename}`}
                                    alt={item.filename}
                                    loading="lazy"
                                />
                                <p className="sample-name">{item.filename}</p>
                            </div>
                        ))}
                    </div>
                    <p className="sample-note">
                        Showing 20 of {stats.generated.toLocaleString()} generated QR codes. 
                        Download the ZIP to get all files.
                    </p>
                </div>
            )}
        </div>
    );
}

export default ResultsDashboard;