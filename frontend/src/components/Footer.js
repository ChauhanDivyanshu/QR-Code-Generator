import React from "react";
import "./Footer.css";

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-inner">
                <p className="footer-text">
                    QR Code Generator Dashboard
                </p>
                <p className="footer-subtext">
                    Upload Excel files, extract links and data, generate
                    production-quality QR codes
                </p>
            </div>
        </footer>
    );
}

export default Footer;