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
    onCancel 
}) {
    const { filename, columns, preview_rows, total_rows, column_names } = previewData;
    
    // Get sample preview for selected columns
    const getQrPreview = () => {
        if (!qrColumn) return null;
        const col = columns.find(c => c.name === qrColumn);
        return col?.samples[0] || "No data";
    };
    
    const getIdPreview = () => {
        if (!idColumn) return null;
        const col = columns.find(c => c.name === idColumn);
        return col?.samples[0] || "No data";
    };
    
    const getFilenamePreview = () => {
        const id = getIdPreview();
        if (!id || id === "No data") return "QR1_AUTO1.png";
        return `QR1_${id}.png`;
    };
    
    return (
        <div className="column-selector">
            <div className="column-selector-header">
                <div className="file-info-badge">
                    <span className="file-info-label">FILE</span>
                    <span className="file-info-name">{filename}</span>
                    <span className="file-info-rows">{total_rows.toLocaleString()} rows</span>
                </div>
                <h2>Configure QR Generation</h2>
                <p>Select which columns to use from your file</p>
            </div>
            
            {/* Column Selection */}
            <div className="selector-cards">
                {/* QR Column */}
                <div className="selector-card selector-card--primary">
                    <div className="selector-card-header">
                        <span className="selector-badge selector-badge--required">REQUIRED</span>
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
                            <option key={col} value={col}>{col}</option>
                        ))}
                    </select>
                    
                    {qrColumn && (
                        <div className="selector-preview">
                            <span className="selector-preview-label">Sample:</span>
                            <span className="selector-preview-value">{getQrPreview()}</span>
                        </div>
                    )}
                </div>
                
                {/* ID Column */}
                <div className="selector-card selector-card--secondary">
                    <div className="selector-card-header">
                        <span className="selector-badge selector-badge--optional">OPTIONAL</span>
                        <h3>Filename ID</h3>
                        <p>Which column should be used in QR image filenames?</p>
                    </div>
                    
                    <select
                        className="selector-dropdown"
                        value={idColumn}
                        onChange={(e) => onIdColumnChange(e.target.value)}
                    >
                        <option value="">-- Auto Generate (QR1, QR2...) --</option>
                        {column_names.map((col) => (
                            <option key={col} value={col} disabled={col === qrColumn}>
                                {col} {col === qrColumn ? "(already used)" : ""}
                            </option>
                        ))}
                    </select>
                    
                    {idColumn && (
                        <div className="selector-preview">
                            <span className="selector-preview-label">Sample:</span>
                            <span className="selector-preview-value">{getIdPreview()}</span>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Filename Preview */}
            <div className="filename-preview">
                <div className="filename-preview-label">Filename Format Preview</div>
                <div className="filename-preview-examples">
                    <code>{getFilenamePreview()}</code>
                    <code>QR2_{idColumn ? (columns.find(c => c.name === idColumn)?.samples[1] || "AUTO2") : "AUTO2"}.png</code>
                    <code>QR3_{idColumn ? (columns.find(c => c.name === idColumn)?.samples[2] || "AUTO3") : "AUTO3"}.png</code>
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
                                            col === qrColumn ? "col-qr" : 
                                            col === idColumn ? "col-id" : ""
                                        }
                                    >
                                        {col}
                                        {col === qrColumn && <span className="col-tag col-tag--qr">QR</span>}
                                        {col === idColumn && <span className="col-tag col-tag--id">ID</span>}
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
                                                col === qrColumn ? "col-qr" : 
                                                col === idColumn ? "col-id" : ""
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
            
            {/* QR Size */}
            <div className="qr-size-section">
                <label className="qr-size-label">QR Code Size</label>
                <select
                    className="selector-dropdown"
                    value={qrSize}
                    onChange={(e) => onSizeChange(Number(e.target.value))}
                >
                    <option value={6}>Small (Faster - Best for large batches)</option>
                    <option value={8}>Medium (Recommended)</option>
                    <option value={10}>Large (Higher quality)</option>
                    <option value={15}>Extra Large</option>
                </select>
            </div>
            
            {/* Action Buttons */}
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