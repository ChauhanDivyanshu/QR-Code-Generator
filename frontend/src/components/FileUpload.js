import React, { useRef, useState, useCallback } from "react";
import "./FileUpload.css";
import { formatFileSize } from "../utils/helpers";

function FileUpload({ file, onFileSelect }) {
    const inputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);

    const validateFile = useCallback(
        (f) => {
            const allowed = [".xlsx", ".xls", ".csv"];
            const ext = "." + f.name.split(".").pop().toLowerCase();
            if (!allowed.includes(ext)) {
                return false;
            }
            onFileSelect(f);
            return true;
        },
        [onFileSelect]
    );

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                validateFile(e.dataTransfer.files[0]);
            }
        },
        [validateFile]
    );

    const handleChange = useCallback(
        (e) => {
            if (e.target.files && e.target.files[0]) {
                validateFile(e.target.files[0]);
            }
        },
        [validateFile]
    );

    const handleRemove = useCallback(
        (e) => {
            e.stopPropagation();
            onFileSelect(null);
            if (inputRef.current) {
                inputRef.current.value = "";
            }
        },
        [onFileSelect]
    );

    return (
        <div
            className={`file-upload ${dragActive ? "file-upload--drag" : ""} ${
                file ? "file-upload--selected" : ""
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !file && inputRef.current?.click()}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleChange}
                className="file-upload-input"
            />

            {!file ? (
                <div className="file-upload-placeholder">
                    <div className="file-upload-icon">
                        <svg
                            width="48"
                            height="48"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                    </div>
                    <p className="file-upload-title">
                        Drag and drop your file here
                    </p>
                    <p className="file-upload-subtitle">
                        or click to browse from your computer
                    </p>
                    <div className="file-upload-formats">
                        <span className="format-tag">.XLSX</span>
                        <span className="format-tag">.XLS</span>
                        <span className="format-tag">.CSV</span>
                    </div>
                </div>
            ) : (
                <div className="file-upload-selected">
                    <div className="file-selected-icon">
                        <svg
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                            <polyline points="10 9 9 9 8 9" />
                        </svg>
                    </div>
                    <div className="file-selected-details">
                        <p className="file-selected-name">{file.name}</p>
                        <p className="file-selected-size">
                            {formatFileSize(file.size)}
                        </p>
                    </div>
                    <button
                        className="file-remove-btn"
                        onClick={handleRemove}
                        title="Remove file"
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}

export default FileUpload;