import React from "react";
import "./LoadingSpinner.css";

function LoadingSpinner() {
    return (
        <div className="loading-container">
            <div className="loading-spinner">
                <div className="spinner-ring" />
            </div>
            <h3 className="loading-title">Generating QR Codes</h3>
            <p className="loading-text">
                Parsing your file and creating high-quality QR codes.
                This may take a moment depending on the file size.
            </p>
        </div>
    );
}

export default LoadingSpinner;