// src/components/tasks/DataTable/TransmittalGenerator.js
const loadScript = (src) =>
  new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement("script");
    s.src = src;
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });

const getPreparedBy = () => {
  try {
    const raw = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (raw) {
      const u = JSON.parse(raw);
      return `${u.first_name || ""} ${u.surname || ""}`.trim();
    }
  } catch (_) {}
  return "___________________";
};

const clean = (val) =>
  val && val !== "N/A" && String(val).trim() !== "" ? String(val).trim() : "—";

/* ================================================================== */
/*  EXCEL                                                              */
/* ================================================================== */
export const generateExcel = async (selectedData, activeTab) => {
  await loadScript(
    "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
  );

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const wsData = [
    ["TRANSMITTAL SLIP — FDA Center for Drug Regulation and Research (CDRR)"],
    [
      `Generated: ${dateStr} ${timeStr}`,
      "", "", "", "", "", "", "", "", "",
      `Total Records: ${selectedData.length}`,
    ],
    [],
    [
      "#",
      "DTN",
      "Company Name",
      "Company Address",
      "SECPA Number",
      "Application Type",
      "Registration Number",
      "Type of Released",
      "Attachment",
      "Date Released",
    ],
  ];

  selectedData.forEach((r, i) => {
    wsData.push([
      i + 1,
      clean(r.dtn),
      clean(r.ltoCompany),
      clean(r.ltoAdd),
      clean(r.secpa),
      clean(r.appType),
      clean(r.regNo),
      clean(r.typeDocReleased),
      clean(r.attaReleased),
      clean(r.dateReleased),
    ]);
  });

  const ws = window.XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [4, 26, 32, 40, 20, 22, 22, 22, 28, 18].map((wch) => ({
    wch,
  }));
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];

  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, "Transmittal");
  window.XLSX.writeFile(
    wb,
    `transmittal_${activeTab ?? "task"}_${now.toISOString().slice(0, 10)}.xlsx`,
  );
};

/* ================================================================== */
/*  PDF                                                                */
/* ================================================================== */
export const generatePDF = async (selectedData, activeTab) => {
  await loadScript(
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  );
  await loadScript(
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
  );
  await loadScript(
    "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js",
  );

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const preparedBy = getPreparedBy();

  /* ── Barcode generator ── */
  const genBarcode = (value) => {
    try {
      const canvas = document.createElement("canvas");
      window.JsBarcode(canvas, String(value), {
        format: "CODE128",
        width: 1.4,
        height: 14,
        displayValue: false,
        margin: 1,
        background: "#ffffff",
        lineColor: "#000000",
      });
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  };

  const barcodeImages = selectedData.map((r) =>
    genBarcode(r.dtn && r.dtn !== "N/A" ? r.dtn : "N/A"),
  );

  /* ── Header ── */
  doc.setFillColor(25, 118, 210);
  doc.rect(0, 0, pageW, 18, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TRANSMITTAL SLIP", 10, 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    "FDA Center for Drug Regulation and Research (CDRR)",
    10,
    13,
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(`Generated: ${dateStr}  ${timeStr}`, pageW - 10, 7.5, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.text(`Total records: ${selectedData.length}`, pageW - 10, 13, {
    align: "right",
  });

  /* ── Columns ── */
  const cols = [
    { header: "#",                   dataKey: "_no"             },
    { header: "Barcode",             dataKey: "_barcode"        },
    { header: "DTN",                 dataKey: "dtn"             },
    { header: "Company Name",        dataKey: "ltoCompany"      },
    { header: "Company Address",     dataKey: "ltoAdd"          },
    { header: "SECPA Number",        dataKey: "secpa"           },
    { header: "Application Type",    dataKey: "appType"         },
    { header: "Registration Number", dataKey: "regNo"           },
    { header: "Type of Released",    dataKey: "typeDocReleased" },
    { header: "Attachment",          dataKey: "attaReleased"    },
    { header: "Date Released",       dataKey: "dateReleased"    },
  ];

  const rows = selectedData.map((r, i) => ({
    _no:             i + 1,
    _barcode:        "",
    dtn:             clean(r.dtn),
    ltoCompany:      clean(r.ltoCompany),
    ltoAdd:          clean(r.ltoAdd),
    secpa:           clean(r.secpa),
    appType:         clean(r.appType),
    regNo:           clean(r.regNo),
    typeDocReleased: clean(r.typeDocReleased),
    attaReleased:    clean(r.attaReleased),
    dateReleased:    clean(r.dateReleased),
  }));

  const ROW_H = 11;
  const BAR_W = 24;
  const BAR_H = 6;

  doc.autoTable({
    startY: 20,
    columns: cols,
    body: rows,
    theme: "grid",
    styles: {
      fontSize: 6.5,
      cellPadding: 1.5,
      overflow: "linebreak",
      textColor: [30, 30, 30],
      minCellHeight: ROW_H,
      valign: "middle",
      lineWidth: 0.1,
      lineColor: [200, 210, 220],
    },
    headStyles: {
      fillColor: [21, 101, 192],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 6.5,
      halign: "center",
      minCellHeight: 8,
      valign: "middle",
      cellPadding: 1.2,
    },
    alternateRowStyles: { fillColor: [240, 247, 255] },
    margin: { left: 5, right: 5 },
    columnStyles: {
      _no:             { halign: "center", cellWidth: 6,  valign: "middle" },
      _barcode:        { cellWidth: 27,    halign: "center", valign: "middle" },
      dtn:             { cellWidth: 27,    halign: "center", valign: "middle", fontStyle: "bold" },
      ltoCompany:      { cellWidth: 34,    valign: "middle" },
      ltoAdd:          { cellWidth: 38,    valign: "middle" },
      secpa:           { cellWidth: 20,    halign: "center", valign: "middle" },
      appType:         { cellWidth: 20,    valign: "middle" },
      regNo:           { cellWidth: 22,    halign: "center", valign: "middle" },
      typeDocReleased: { cellWidth: 22,    valign: "middle" },
      attaReleased:    { cellWidth: 28,    valign: "middle" },
      dateReleased:    { cellWidth: 20,    halign: "center", valign: "middle" },
    },
    didDrawCell: (h) => {
      if (h.section === "body" && h.column.dataKey === "_barcode") {
        const img = barcodeImages[h.row.index];
        if (img) {
          const cell = h.cell;
          doc.addImage(
            img,
            "PNG",
            cell.x + (cell.width - BAR_W) / 2,
            cell.y + (cell.height - BAR_H) / 2,
            BAR_W,
            BAR_H,
          );
        }
      }
    },
  });

  /* ── Page numbers ── */
  const totalPgs = doc.internal.getNumberOfPages();
  for (let pg = 1; pg <= totalPgs; pg++) {
    doc.setPage(pg);
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageH - 8, pageW, 8, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(130);
    doc.text(
      `Page ${pg} of ${totalPgs}  |  FDA-CDRR DBMS — Transmittal Slip`,
      pageW / 2,
      pageH - 3,
      { align: "center" },
    );
  }

  /* ── Footer signatures ── */
  doc.setPage(totalPgs);
  const finalY = doc.lastAutoTable.finalY + 6;

  if (finalY < pageH - 28) {
    const col1X = 10;
    const col2X = pageW / 2;
    const baseY = finalY + 5;

    doc.setDrawColor(180);
    doc.setLineWidth(0.25);

    // Prepared by
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(60);
    doc.text("Prepared by:", col1X, baseY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(`${preparedBy}`, col1X, baseY + 5);
    doc.text(`Date: ${dateStr}`, col1X, baseY + 9);
    doc.line(col1X, baseY + 11, col1X + 70, baseY + 11);

    // Received by
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(60);
    doc.text("Received by:", col2X, baseY);
    doc.line(col2X, baseY + 11, col2X + 70, baseY + 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(130);
    doc.text("Signature over Printed Name / Date", col2X, baseY + 14);
  }

  doc.save(
    `transmittal_${activeTab ?? "task"}_${now.toISOString().slice(0, 10)}.pdf`,
  );
};

/* ================================================================== */
/*  COMBINED                                                           */
/* ================================================================== */
export const generateTransmittal = async (selectedData, activeTab) => {
  await generatePDF(selectedData, activeTab);
  await generateExcel(selectedData, activeTab);
};



/* ================================================================== */
/*  CORRECTION / RECONSTRUCTION TRANSMITTAL                           */
/* ================================================================== */
export const generateCorrectionTransmittal = async (selectedData, activeTab) => {
  await loadScript(
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  );
  await loadScript(
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
  );
  await loadScript(
    "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js",
  );

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const preparedBy = getPreparedBy();

  /* ── Barcode ── */
  const genBarcode = (value) => {
    try {
      const canvas = document.createElement("canvas");
      window.JsBarcode(canvas, String(value), {
        format: "CODE128",
        width: 1.4,
        height: 14,
        displayValue: false,
        margin: 1,
        background: "#ffffff",
        lineColor: "#000000",
      });
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  };

  const barcodeImages = selectedData.map((r) =>
    genBarcode(r.dtn && r.dtn !== "N/A" ? r.dtn : "N/A"),
  );

  /* ── Header ── */
  doc.setFillColor(25, 118, 210);
  doc.rect(0, 0, pageW, 18, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CORRECTION / RECONSTRUCTION TRANSMITTAL SLIP", 10, 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("FDA Center for Drug Regulation and Research (CDRR)", 10, 13);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(`Generated: ${dateStr}  ${timeStr}`, pageW - 10, 7.5, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.text(`Total records: ${selectedData.length}`, pageW - 10, 13, {
    align: "right",
  });

  /* ── Columns ── */
  const cols = [
    { header: "#",              dataKey: "_no"          },
    { header: "Barcode",        dataKey: "_barcode"     },
    { header: "DTN",            dataKey: "dtn"          },
    { header: "Old DTN",        dataKey: "oldDtn"       },
    { header: "Date Received",  dataKey: "dateReceived" },
    { header: "Type of Letter", dataKey: "typeOfLetter" },
    { header: "Subject",        dataKey: "subject"      },
    { header: "Evaluator",      dataKey: "evaluator"    },
    { header: "Remarks",        dataKey: "remarks"      },
  ];

  const rows = selectedData.map((r, i) => ({
    _no:          i + 1,
    _barcode:     "",
    dtn:          clean(r.dtn),
    oldDtn:       clean(r.oldDtn),
    dateReceived: clean(r.dateReceived),
    typeOfLetter: clean(r.typeOfLetter),
    subject:      clean(r.subject),
    evaluator:    r.evaluator || "",  
    remarks:      "",    
  }));

  const ROW_H = 11;
  const BAR_W = 24;
  const BAR_H = 6;

  doc.autoTable({
    startY: 20,
    columns: cols,
    body: rows,
    theme: "grid",
    styles: {
      fontSize: 6.5,
      cellPadding: 1.5,
      overflow: "linebreak",
      textColor: [30, 30, 30],
      minCellHeight: ROW_H,
      valign: "middle",
      lineWidth: 0.1,
      lineColor: [200, 210, 220],
    },
    headStyles: {
      fillColor: [21, 101, 192],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 6.5,
      halign: "center",
      minCellHeight: 8,
      valign: "middle",
      cellPadding: 1.2,
    },
    alternateRowStyles: { fillColor: [240, 247, 255] },
    margin: { left: 5, right: 5 },
    columnStyles: {
      _no:          { halign: "center", cellWidth: 6,  valign: "middle" },
      _barcode:     { cellWidth: 27,    halign: "center", valign: "middle" },
      dtn:          { cellWidth: 27,    halign: "center", valign: "middle", fontStyle: "bold" },
      oldDtn:       { cellWidth: 27,    halign: "center", valign: "middle" },
      dateReceived: { cellWidth: 22,    halign: "center", valign: "middle" },
      typeOfLetter: { cellWidth: 25,    valign: "middle" },
      subject:      { cellWidth: 68,    valign: "top",    overflow: "linebreak", fontStyle: "normal" },
      evaluator:    { cellWidth: 30,    valign: "middle" },
      remarks:      { cellWidth: 38,    valign: "middle" },
    },
    didDrawCell: (h) => {
      if (h.section === "body" && h.column.dataKey === "_barcode") {
        const img = barcodeImages[h.row.index];
        if (img) {
          const cell = h.cell;
          doc.addImage(
            img,
            "PNG",
            cell.x + (cell.width - BAR_W) / 2,
            cell.y + (cell.height - BAR_H) / 2,
            BAR_W,
            BAR_H,
          );
        }
      }
    },
  });

  /* ── Page numbers ── */
  const totalPgs = doc.internal.getNumberOfPages();
  for (let pg = 1; pg <= totalPgs; pg++) {
    doc.setPage(pg);
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageH - 8, pageW, 8, "F");
    doc.setFontSize(6.5);
    doc.setTextColor(130);
    doc.text(
      `Page ${pg} of ${totalPgs}  |  FDA-CDRR DBMS — Correction/Reconstruction Transmittal`,
      pageW / 2,
      pageH - 3,
      { align: "center" },
    );
  }

  /* ── Footer signatures ── */
  doc.setPage(totalPgs);
  const finalY = doc.lastAutoTable.finalY + 6;

  if (finalY < pageH - 28) {
    const col1X = 10;
    const col2X = pageW / 2;
    const baseY = finalY + 5;

    doc.setDrawColor(180);
    doc.setLineWidth(0.25);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(60);
    doc.text("Prepared by:", col1X, baseY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(`${preparedBy}`, col1X, baseY + 5);
    doc.text(`Date: ${dateStr}`, col1X, baseY + 9);
    doc.line(col1X, baseY + 11, col1X + 70, baseY + 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(60);
    doc.text("Received by:", col2X, baseY);
    doc.line(col2X, baseY + 11, col2X + 70, baseY + 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(130);
    doc.text("Signature over Printed Name / Date", col2X, baseY + 14);
  }

  doc.save(
    `correction_transmittal_${activeTab ?? "task"}_${now.toISOString().slice(0, 10)}.pdf`,
  );
};