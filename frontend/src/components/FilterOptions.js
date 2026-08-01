import React from "react";
import "./FilterOptions.css";

function FilterOptions({ filter, onFilterChange, qrSize, onSizeChange }) {
    return (
        <div className="filter-options">
            <div className="filter-group">
                <label className="filter-label">Data Filter</label>
                <select
                    className="filter-select"
                    value={filter}
                    onChange={(e) => onFilterChange(e.target.value)}
                >
                    <option value="urls_only">URLs and Links Only</option>
                    <option value="all">All Content (URLs + Text)</option>
                    <option value="text_only">Text Only</option>
                </select>
                <span className="filter-hint">
                    Choose which type of data to extract from the file
                </span>
            </div>
            <div className="filter-group">
                <label className="filter-label">QR Code Size</label>
                <select
                    className="filter-select"
                    value={qrSize}
                    onChange={(e) => onSizeChange(Number(e.target.value))}
                >
                    <option value={6}>Small</option>
                    <option value={10}>Medium (Recommended)</option>
                    <option value={15}>Large</option>
                    <option value={20}>Extra Large</option>
                </select>
                <span className="filter-hint">
                    Larger sizes produce higher resolution images
                </span>
            </div>
        </div>
    );
}

export default FilterOptions;