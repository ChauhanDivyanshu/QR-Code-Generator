import React from "react";
import "./ProgressBar.css";

function ProgressBar({ job }) {
    if (!job) {
        return (
            <div className="progress-container">
                <div className="progress-header">
                    <h3 className="progress-title">Starting...</h3>
                    <p className="progress-message">Initializing job</p>
                </div>
            </div>
        );
    }

    const percentage = job.progress || 0;
    const current = job.current || 0;
    const total = job.total || 0;

    return (
        <div className="progress-container">
            <div className="progress-header">
                <h3 className="progress-title">Generating QR Codes</h3>
                <p className="progress-message">{job.message || "Processing..."}</p>
            </div>

            <div className="progress-stats">
                <div className="progress-stat">
                    <span className="progress-stat-label">Progress</span>
                    <span className="progress-stat-value">{percentage.toFixed(1)}%</span>
                </div>
                <div className="progress-stat">
                    <span className="progress-stat-label">Completed</span>
                    <span className="progress-stat-value">
                        {current.toLocaleString()} / {total.toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="progress-bar-track">
                <div
                    className="progress-bar-fill"
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <p className="progress-note">
                Please wait, do not close this window. Large batches may take several minutes.
            </p>
        </div>
    );
}

export default ProgressBar;