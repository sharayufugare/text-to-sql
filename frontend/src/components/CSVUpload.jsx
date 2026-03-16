import React, { useState } from "react";
import axios from "axios";

const CSVUpload = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile);
      setMessage({ text: "", type: "" });
    } else {
      setFile(null);
      setMessage({ text: "Please select a valid CSV file.", type: "error" });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setMessage({ text: "Uploading...", type: "info" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:5000/api/upload_csv", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage({
        text: `Successfully uploaded "${file.name}" as table "${response.data.table_name}"`,
        type: "success",
      });
      setFile(null);
      // Reset file input
      document.getElementById("csv-file-input").value = "";
      
      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }
    } catch (err) {
      console.error(err);
      setMessage({
        text: err.response?.data?.error || "Failed to upload CSV.",
        type: "error",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="csv-upload-card">
      <h3>Upload Custom Dataset (CSV)</h3>
      <p className="upload-help">Upload a CSV to create a new table you can query.</p>
      
      <div className="upload-controls">
        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={uploading}
          className="file-input"
        />
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`upload-btn ${!file || uploading ? "disabled" : ""}`}
        >
          {uploading ? "Uploading..." : "Upload CSV"}
        </button>
      </div>

      {message.text && (
        <div className={`upload-msg ${message.type}`}>
          {message.text}
        </div>
      )}

      <style>{`
        .csv-upload-card {
          background: white;
          padding: 24px;
          border-radius: 12px;
          border: 1px solid var(--border);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          margin-bottom: 32px;
        }
        .csv-upload-card h3 {
          margin-top: 0;
          margin-bottom: 8px;
          font-size: 18px;
        }
        .upload-help {
          color: var(--text-light);
          font-size: 14px;
          margin-bottom: 20px;
        }
        .upload-controls {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .file-input {
          flex: 1;
          padding: 8px;
          border: 1px dashed var(--border);
          border-radius: 6px;
          font-size: 14px;
        }
        .upload-btn {
          padding: 10px 20px;
          background-color: #10b981;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .upload-btn:hover:not(.disabled) {
          background-color: #059669;
        }
        .upload-btn.disabled {
          background-color: #d1d5db;
          cursor: not-allowed;
        }
        .upload-msg {
          margin-top: 16px;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
        }
        .upload-msg.success {
          background-color: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        }
        .upload-msg.error {
          background-color: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .upload-msg.info {
          background-color: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        }
      `}</style>
    </div>
  );
};

export default CSVUpload;
