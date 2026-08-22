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

  // Parse metrics from backend message string
  const speedMatch = message.match(/Speed:\s*([\d,\.]+)/);
  const etaMatch = message.match(/ETA:\s*([^\|]+)/);
  const speed = speedMatch ? speedMatch[1].replace(",", "") : null;
  const eta = etaMatch ? etaMatch[1].trim() : null;

  // Phase matching logic
  const isReading = message.toLowerCase().includes("reading");
  const isZipping =
    message.toLowerCase().includes("zip") ||
    message.toLowerCase().includes("creating");
  const isGenerating = current > 0 || percentage > 0;

  let activeStep = 1;
  if (isZipping) {
    activeStep = 4;
  } else if (isGenerating) {
    activeStep = 3;
  } else if (isReading) {
    activeStep = 1;
  } else {
    activeStep = 2;
  }

  const phases = [
    { step: 1, label: "Read File" },
    { step: 2, label: "Prepare" },
    { step: 3, label: "Generate QR" },
    { step: 4, label: "Create ZIP" },
  ];

  const cleanMessage = message.split("|")[0].trim();

  return (
    <div className="progress-container">
      <div className="progress-header">
        <div className="progress-spinner"></div>
        <h3 className="progress-title">Generating QR Codes</h3>
        <p className="progress-subtitle">
          High-performance multi-threaded generation in progress
        </p>
      </div>

      {/* Step Indicators */}
      <div className="progress-phases">
        {phases.map((p) => (
          <div
            key={p.step}
            className={`progress-phase ${
              p.step < activeStep
                ? "progress-phase--done"
                : p.step === activeStep
                  ? "progress-phase--active"
                  : "progress-phase--pending"
            }`}
          >
            <div className="progress-phase-dot">
              {p.step < activeStep ? "✓" : p.step}
            </div>
            <span className="progress-phase-label">{p.label}</span>
          </div>
        ))}
      </div>

      {/* Percentage Display */}
      <div className="progress-percentage-big">
        {percentage.toFixed(1)}
        <span>%</span>
      </div>

      {/* Visual Bar */}
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Metric Cards */}
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
          <span className="progress-metric-value">{eta || "—"}</span>
          <span className="progress-metric-sublabel">
            {eta ? "estimated" : "calculating..."}
          </span>
        </div>
      </div>

      {/* Current Status Message */}
      <div className="progress-status">
        <div className="progress-status-dot"></div>
        <span>{cleanMessage}</span>
      </div>

      <p className="progress-note">
        Please keep this window open. Files are being saved directly to your
        Desktop.
      </p>
    </div>
  );
}

export default ProgressBar;
