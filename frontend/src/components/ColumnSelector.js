import React from "react";
import "./ColumnSelector.css";

function ColumnSelector({
  previewData,
  qrColumn,
  idColumn,
  qrSize,
  onQrColumnChange,
  onIdColumnChange,
  onSizeChange,
  onGenerate,
  onCancel,
}) {
  const { filename, columns, preview_rows, total_rows, column_names } =
    previewData;

  const getQrPreview = () => {
    if (!qrColumn) return null;
    const col = columns.find((c) => c.name === qrColumn);
    return col?.samples[0] || "No data";
  };

  const getIdSample = (index = 0) => {
    if (!idColumn) return `AUTO${index + 1}`;
    const col = columns.find((c) => c.name === idColumn);
    const val = col?.samples[index];
    return val && val.trim() !== "" ? val.trim() : `AUTO${index + 1}`;
  };

  const example1 = `${getIdSample(0)}.png`;
  const example2 = `${getIdSample(1)}.png`;
  const example3 = `${getIdSample(2)}.png`;

  return (
    <div className="column-selector">
      <div className="column-selector-header">
        <div className="file-info-badge">
          <span className="file-info-label">FILE</span>
          <span className="file-info-name">{filename}</span>
          <span className="file-info-rows">
            {total_rows.toLocaleString()} rows
          </span>
        </div>
        <h2>Configure QR Generation</h2>
        <p>Select which columns to use from your file</p>
      </div>

      {/* Selector Cards */}
      <div className="selector-cards">
        <div className="selector-card selector-card--primary">
          <div className="selector-card-header">
            <span className="selector-badge selector-badge--required">
              REQUIRED
            </span>
            <h3>QR Code Content</h3>
            <p>Which column contains URLs or data to convert into QR?</p>
          </div>

          <select
            className="selector-dropdown"
            value={qrColumn}
            onChange={(e) => onQrColumnChange(e.target.value)}
          >
            <option value="">-- Select Column --</option>
            {column_names.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>

          {qrColumn && (
            <div className="selector-preview">
              <span className="selector-preview-label">Sample:</span>
              <span className="selector-preview-value">{getQrPreview()}</span>
            </div>
          )}
        </div>

        <div className="selector-card selector-card--secondary">
          <div className="selector-card-header">
            <span className="selector-badge selector-badge--optional">
              OPTIONAL
            </span>
            <h3>Filename ID</h3>
            <p>Which column should be used for naming QR images?</p>
          </div>

          <select
            className="selector-dropdown"
            value={idColumn}
            onChange={(e) => onIdColumnChange(e.target.value)}
          >
            <option value="">
              -- Auto Generate (AUTO1.png, AUTO2.png...) --
            </option>
            {column_names.map((col) => (
              <option key={col} value={col} disabled={col === qrColumn}>
                {col} {col === qrColumn ? "(used for QR content)" : ""}
              </option>
            ))}
          </select>

          {idColumn && (
            <div className="selector-preview">
              <span className="selector-preview-label">Sample:</span>
              <span className="selector-preview-value">{getIdSample(0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filename Preview */}
      <div className="filename-preview">
        <div className="filename-preview-label">Filename Format Preview</div>
        <div className="filename-preview-examples">
          <code>{example1}</code>
          <code>{example2}</code>
          <code>{example3}</code>
          <span className="filename-preview-more">... and so on</span>
        </div>
      </div>

      {/* Data Preview Table */}
      <div className="data-preview">
        <h3 className="data-preview-title">Data Preview (First 5 Rows)</h3>
        <div className="data-preview-wrapper">
          <table className="data-preview-table">
            <thead>
              <tr>
                <th>#</th>
                {column_names.map((col) => (
                  <th
                    key={col}
                    className={
                      col === qrColumn
                        ? "col-qr"
                        : col === idColumn
                          ? "col-id"
                          : ""
                    }
                  >
                    {col}
                    {col === qrColumn && (
                      <span className="col-tag col-tag--qr">QR Content</span>
                    )}
                    {col === idColumn && (
                      <span className="col-tag col-tag--id">Filename ID</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview_rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="row-number">{idx + 1}</td>
                  {column_names.map((col) => (
                    <td
                      key={col}
                      className={
                        col === qrColumn
                          ? "col-qr"
                          : col === idColumn
                            ? "col-id"
                            : ""
                      }
                    >
                      {row[col] || "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Scale - Medium (6) Default */}
      <div className="qr-size-section">
        <label className="qr-size-label">QR Code Scale</label>
        <select
          className="selector-dropdown"
          value={qrSize}
          onChange={(e) => onSizeChange(Number(e.target.value))}
        >
          <option value={4}>Small (Scale 4 - Fastest for large batches)</option>
          <option value={6}>Medium (Scale 6 - Standard)</option>
          <option value={8}>Large (Scale 8 - High Resolution)</option>
        </select>
      </div>

      {/* Actions */}
      <div className="selector-actions">
        <button className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn-generate-final"
          onClick={onGenerate}
          disabled={!qrColumn}
        >
          Generate {total_rows.toLocaleString()} QR Codes
        </button>
      </div>
    </div>
  );
}

export default ColumnSelector;
