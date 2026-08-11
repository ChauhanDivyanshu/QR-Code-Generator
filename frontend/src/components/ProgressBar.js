import React from "react";
import "./ProgressBar.css";

function ProgressBar({ job }) {
    if (!job) {
        return (
            <div className="progress-container">
                <div className="progress-header">
                    <div className="progress-spinner"></div>
                    <h3 className="progress-title">Starting...</h3>
                    <p className="progress-subtitle">Initializing job</p>
                </div>
            </div>
        );
    }

    const percentage = job.progress || 0;
    const current = job.current || 0;
    const total = job.total || 0;
    const message = job.message || "Processing...";
    
    // Parse metrics from message
    const speedMatch = message.match(/Speed:\s*([\d,\.]+)/);
    const etaMatch = message.match(/ETA:\s*([^\|]+)/);
    const speed = speedMatch ? speedMatch[1].replace(',', '') : null;
    const eta = etaMatch ? etaMatch[1].trim() : null;
    
    // Detect current phase
    const isReading = message.toLowerCase().includes("reading");
    const isStarting = message.toLowerCase().includes("starting");
    const isGenerating = message.toLowerCase().includes("generated") && !message.toLowerCase().includes("zip");
    const isZipping = message.toLowerCase().includes("zip") || message.toLowerCase().includes("creating");
    
    const currentPhase = isReading ? "READING" : isStarting ? "PREPARING" : isZipping ? "PACKAGING" : isGenerating ? "GENERATING" : "PROCESSING";
    
    const phases = [
        { key: "READING", label: "Read File" },
        { key: "PREPARING", label: "Prepare" },
        { key: "GENERATING", label: "Generate QR" },
        { key: "PACKAGING", label: "Create ZIP" },
    ];
    
    const currentPhaseIndex = phases.findIndex(p => p.key === currentPhase);
    
    // Clean status message
    const cleanMessage = message.split('|')[0].trim();

    return (
        <div className="progress-container">
            <div className="progress-header">
                <div className="progress-spinner"></div>
                <h3 className="progress-title">Generating QR Codes</h3>
                <p className="progress-subtitle">
                    Please wait while we process your file
                </p>
            </div>

            {/* Phase Indicator */}
            <div className="progress-phases">
                {phases.map((phase, idx) => (
                    <div 
                        key={phase.key}
                        className={`progress-phase ${
                            idx < currentPhaseIndex ? "progress-phase--done" : 
                            idx === currentPhaseIndex ? "progress-phase--active" : 
                            "progress-phase--pending"
                        }`}
                    >
                        <div className="progress-phase-dot">
                            {idx < currentPhaseIndex ? "✓" : idx + 1}
                        </div>
                        <span className="progress-phase-label">{phase.label}</span>
                    </div>
                ))}
            </div>

            {/* Percentage */}
            <div className="progress-percentage-big">
                {percentage.toFixed(1)}<span>%</span>
            </div>

            {/* Progress Bar */}
            <div className="progress-bar-track">
                <div
                    className="progress-bar-fill"
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {/* Metrics */}
            <div className="progress-metrics">
                <div className="progress-metric">
                    <span className="progress-metric-label">Completed</span>
                    <span className="progress-metric-value">
                        {current.toLocaleString()}
                    </span>
                    <span className="progress-metric-sublabel">
                        of {total.toLocaleString()}
                    </span>
                </div>
                
                <div className="progress-metric">
                    <span className="progress-metric-label">Speed</span>
                    <span className="progress-metric-value">
                        {speed ? parseInt(speed).toLocaleString() : "—"}
                    </span>
                    <span className="progress-metric-sublabel">
                        {speed ? "QR/sec" : "calculating..."}
                    </span>
                </div>
                
                <div className="progress-metric">
                    <span className="progress-metric-label">Time Left</span>
                    <span className="progress-metric-value">
                        {eta || "—"}
                    </span>
                    <span className="progress-metric-sublabel">
                        {eta ? "estimated" : "calculating..."}
                    </span>
                </div>
            </div>

            {/* Current Status */}
            <div className="progress-status">
                <div className="progress-status-dot"></div>
                <span>{cleanMessage}</span>
            </div>

            <p className="progress-note">
                Please keep this window open. Files are being saved to your Desktop.
            </p>
        </div>
    );
}

export default ProgressBar;