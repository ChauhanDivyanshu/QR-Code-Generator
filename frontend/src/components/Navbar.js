import React from "react";
import "./Navbar.css";

function Navbar() {
    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <div className="navbar-brand">
                    <div className="navbar-logo">
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <rect x="2" y="2" width="6" height="6" rx="1" />
                            <rect x="16" y="2" width="6" height="6" rx="1" />
                            <rect x="2" y="16" width="6" height="6" rx="1" />
                            <rect x="16" y="16" width="2" height="2" />
                            <rect x="20" y="16" width="2" height="2" />
                            <rect x="16" y="20" width="2" height="2" />
                            <rect x="20" y="20" width="2" height="2" />
                            <rect x="12" y="2" width="2" height="6" />
                            <rect x="2" y="12" width="6" height="2" />
                            <rect x="12" y="12" width="2" height="2" />
                        </svg>
                    </div>
                    <span className="navbar-title">QR Code Generator</span>
                </div>
                <div className="navbar-info">
                    Excel to QR Code Dashboard
                </div>
            </div>
        </nav>
    );
}

export default Navbar;