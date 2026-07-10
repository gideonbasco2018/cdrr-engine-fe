// FILE: src/pages/BulkFolderDocumentUploadPage.jsx
import { useState } from "react";
import { FolderOpen, ClipboardList } from "lucide-react";

import { getColors, buildStyles } from "../components/bulk-folder-upload/theme";
import UploadFolderTab from "../components/bulk-folder-upload/UploadFolderTab";
import UploadLogsTab from "../components/bulk-folder-upload/UploadLogsTab";

/**
 * BulkFolderDocumentUploadPage
 *
 * Sumusunod sa parehong pattern ng TaskPage.jsx — `darkMode` ay ipinapasa
 * bilang prop mula sa parent/layout. Dalawang tabs:
 *  - "Upload Folder"  — select/drag an ENTIRE folder. The folder's name
 *                        becomes the DTN and any nested subfolders (any
 *                        depth) automatically become the doc_category —
 *                        nothing to type except Entry Type.
 *  - "Upload Logs"     — audit view ng lahat ng upload attempts (success +
 *                        failed), across lahat ng batches, filterable by
 *                        status / uploader / DTN.
 */
function BulkFolderDocumentUploadPage({ darkMode }) {
  const colors = getColors(darkMode);
  const s = buildStyles(colors);

  const [activeTab, setActiveTab] = useState("folder"); // "folder" | "logs"

  return (
    <div style={s.page} className="bdu-page">
      <div style={s.shell}>
        <header style={s.header}>
          <div>
            <h1 style={s.title} className="bdu-title">
              Batch Folder Upload
            </h1>
            <p style={s.subtitle}>
              Upload an entire folder of supporting documents, or review past
              batch upload logs.
            </p>
          </div>
        </header>

        <div style={s.tabBar} className="bdu-tabBar">
          <button
            type="button"
            onClick={() => setActiveTab("folder")}
            className="bdu-tabBtn"
            style={{
              ...s.tabBtn,
              ...(activeTab === "folder" ? s.tabBtnActive : {}),
            }}
          >
            <FolderOpen size={14} /> Upload Folder
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className="bdu-tabBtn"
            style={{
              ...s.tabBtn,
              ...(activeTab === "logs" ? s.tabBtnActive : {}),
            }}
          >
            <ClipboardList size={14} /> Upload Logs
          </button>
        </div>

        {activeTab === "folder" && <UploadFolderTab colors={colors} s={s} />}
        {activeTab === "logs" && <UploadLogsTab colors={colors} s={s} />}
      </div>

      <style>{`
        * { box-sizing: border-box; }

        @keyframes bdu-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @keyframes bdu-pop-in {
        0%   { transform: scale(0.3); opacity: 0; }
        60%  { transform: scale(1.25); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
        }

        html, body {
          overflow-x: hidden;
        }

        .bdu-page {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }

        .bdu-layout {
          display: grid;
          grid-template-columns: minmax(0, 340px) 1fr;
          gap: 16px;
          align-items: start;
          width: 100%;
          max-width: 100%;
        }
        .bdu-layout > * {
          min-width: 0;
          max-width: 100%;
        }
        .bdu-leftCol {
          overscroll-behavior: contain;
          min-width: 0;
        }
        .bdu-fieldGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          min-width: 0;
        }

        .bdu-page input,
        .bdu-page select,
        .bdu-page textarea {
          min-width: 0;
          max-width: 100%;
        }

        @media (max-width: 860px) {
          .bdu-layout {
            grid-template-columns: 1fr;
          }
          .bdu-leftCol {
            max-height: none !important;
            overflow: visible !important;
            padding-right: 0 !important;
          }
          .bdu-previewCol {
            position: static !important;
            max-height: none !important;
            min-height: 420px !important;
          }
        }

        @media (max-width: 860px) {
          .bdu-previewCard {
            min-height: 420px !important;
          }
          .bdu-previewFrame {
            min-height: 380px !important;
          }
        }

        @media (max-width: 520px) {
          .bdu-page {
            padding: 14px 8px !important;
          }
          .bdu-card {
            padding: 10px !important;
          }
          .bdu-fieldGrid {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .bdu-title {
            font-size: 17px !important;
          }
          .bdu-tabBar {
            gap: 2px !important;
          }
          .bdu-tabBtn {
            padding: 8px 10px !important;
            font-size: 12.5px !important;
          }
          .bdu-dropzone {
            padding: 14px 8px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default BulkFolderDocumentUploadPage;
