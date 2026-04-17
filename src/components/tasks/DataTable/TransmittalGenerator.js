/* ================================================================== */
/*  DataTable — TransmittalGenerator.js                               */
/* ================================================================== */

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

export const generateExcel = async (selectedData, activeTab) => {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });
  const timeStr = now.toLocaleTimeString("en-PH", { hour:"2-digit", minute:"2-digit" });
  const preparedBy = getPreparedBy();

  const wsData = [
    ["TRANSMITTAL SLIP — FDA Center for Drug Regulation and Research (CDRR)"],
    [`Generated: ${dateStr} ${timeStr}`, "","","","","","","","","","","","", `Total Records: ${selectedData.length}`],
    [],
    ["#","DTN","Category","LTO Company","Brand Name","Generic Name","Dosage Strength","Dosage Form","App No.","App Type","Amendment 1","Amendment 2","Amendment 3","Date Rcvd FDAC"],
  ];

  selectedData.forEach((r, i) => {
    wsData.push([
      i + 1, r.dtn ?? "—", r.estCat ?? "—", r.ltoCompany ?? "—",
      r.prodBrName ?? "—", r.prodGenName ?? "—", r.prodDosStr ?? "—",
      r.prodDosForm ?? "—", r.regNo ?? "—", r.appType ?? "—",
      r.ammend1 && r.ammend1 !== "N/A" ? r.ammend1 : "",
      r.ammend2 && r.ammend2 !== "N/A" ? r.ammend2 : "",
      r.ammend3 && r.ammend3 !== "N/A" ? r.ammend3 : "",
      r.dateReceivedFdac ?? "—",
    ]);
  });

  wsData.push([], [],
    [`Prepared by/Date: ${preparedBy} / ${dateStr}`],
    ["Received by Name/Date:"], [],
    ["MELODY M. ZAMUDIO, RPh, MGM-ESP"],
    ["FDRO V/Chief, LRD"],
    ["Center for Drug Regulation and Research"], [],
    ["NON-ACCEPTANCE AND SWITCHING REQUIRES PRIOR APPROVAL BY CHIEF LRD"],
  );

  const ws = window.XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = [4,22,12,36,30,30,18,18,18,22,18,18,18,18].map((wch) => ({ wch }));
  ws["!merges"] = [{ s:{ r:0, c:0 }, e:{ r:0, c:13 } }];
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, "Transmittal");
  window.XLSX.writeFile(wb, `transmittal_${activeTab ?? "task"}_${now.toISOString().slice(0,10)}.xlsx`);
};

export const generatePDF = async (selectedData, activeTab) => {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");
  await loadScript("https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-PH", { year:"numeric", month:"long", day:"numeric" });
  const timeStr = now.toLocaleTimeString("en-PH", { hour:"2-digit", minute:"2-digit" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const preparedBy = getPreparedBy();

  const genBarcode = (value) => {
    try {
      const canvas = document.createElement("canvas");
      window.JsBarcode(canvas, String(value), { format:"CODE128", width:1.4, height:14, displayValue:false, margin:1, background:"#ffffff", lineColor:"#000000" });
      return canvas.toDataURL("image/png");
    } catch { return null; }
  };

  const barcodeImages = selectedData.map((r) => genBarcode(r.dtn && r.dtn !== "N/A" ? r.dtn : "N/A"));

  doc.setFillColor(25, 118, 210);
  doc.rect(0, 0, pageW, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TRANSMITTAL SLIP", 10, 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("FDA Center for Drug Regulation and Research (CDRR)", 10, 13);
  doc.text(`Generated: ${dateStr}  ${timeStr}`, pageW - 10, 7, { align:"right" });
  doc.text(`Total records: ${selectedData.length}`, pageW - 10, 13, { align:"right" });

  const cols = [
    { header:"#", dataKey:"_no" },
    { header:"Barcode", dataKey:"_barcode" },
    { header:"DTN", dataKey:"dtn" },
    { header:"Category", dataKey:"estCat" },
    { header:"LTO Company", dataKey:"ltoCompany" },
    { header:"Product Information", dataKey:"_productInfo" },
    { header:"Dosage", dataKey:"_dosage" },
    { header:"App No.", dataKey:"regNo" },
    { header:"App Type", dataKey:"_appTypeFull" },
    { header:"Date Rcvd FDAC", dataKey:"dateReceivedFdac" },
  ];

  const rows = selectedData.map((r, i) => {
    const brand = r.prodBrName && r.prodBrName !== "N/A" ? `Brand: ${r.prodBrName}` : "";
    const generic = r.prodGenName && r.prodGenName !== "N/A" ? `Generic: ${r.prodGenName}` : "";
    const strength = r.prodDosStr && r.prodDosStr !== "N/A" ? r.prodDosStr : "";
    const form = r.prodDosForm && r.prodDosForm !== "N/A" ? r.prodDosForm : "";
    const amendments = [r.ammend1, r.ammend2, r.ammend3].filter((a) => a && a !== "N/A" && a.trim() !== "").join(" / ");
    return {
      _no: i + 1, _barcode: "",
      dtn: r.dtn ?? "—", estCat: r.estCat ?? "—", ltoCompany: r.ltoCompany ?? "—",
      _productInfo: [brand, generic].filter(Boolean).join("\n") || "—",
      _dosage: [strength, form].filter(Boolean).join(" / ") || "—",
      regNo: r.regNo ?? "—",
      _appTypeFull: [r.appType ?? "—", amendments].filter(Boolean).join("\n"),
      dateReceivedFdac: r.dateReceivedFdac ?? "—",
    };
  });

  const BRH = 10, BIW = 24, BIH = 5;
  doc.autoTable({
    startY: 18, columns: cols, body: rows, theme:"grid",
    styles: { fontSize:6.5, cellPadding:1.2, overflow:"linebreak", textColor:[30,30,30], minCellHeight:BRH, valign:"middle", lineWidth:0.1 },
    headStyles: { fillColor:[21,101,192], textColor:255, fontStyle:"bold", fontSize:6.5, halign:"center", minCellHeight:7, valign:"middle", cellPadding:1 },
    alternateRowStyles: { fillColor:[240,247,255] },
    margin: { left:6, right:6 },
    columnStyles: {
      _no:           { halign:"center", cellWidth:7,  valign:"middle" },
      _barcode:      { cellWidth:28, halign:"center", valign:"middle" },
      dtn:           { cellWidth:28, halign:"center", valign:"middle", fontStyle:"bold" },
      estCat:        { cellWidth:14, valign:"middle" },
      ltoCompany:    { cellWidth:42, valign:"middle" },
      _productInfo:  { cellWidth:48, valign:"middle" },
      _dosage:       { cellWidth:30, valign:"middle" },
      regNo:         { cellWidth:22, halign:"center", valign:"middle" },
      _appTypeFull:  { cellWidth:34, valign:"middle" },
      dateReceivedFdac: { cellWidth:22, halign:"center", valign:"middle" },
    },
    didDrawCell: (h) => {
      if (h.section === "body" && h.column.dataKey === "_barcode") {
        const img = barcodeImages[h.row.index];
        if (img) {
          const cell = h.cell;
          doc.addImage(img, "PNG", cell.x + (cell.width - BIW) / 2, cell.y + (cell.height - BIH) / 2, BIW, BIH);
        }
      }
    },
  });

  const totalPgs = doc.internal.getNumberOfPages();
  for (let pg = 1; pg <= totalPgs; pg++) {
    doc.setPage(pg);
    doc.setFillColor(255, 255, 255);
    doc.rect(0, pageH - 8, pageW, 8, "F");
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`Page ${pg} of ${totalPgs}  |  FDA-CDRR DBMS — Transmittal Slip`, pageW / 2, pageH - 3, { align:"center" });
    doc.setTextColor(30, 30, 30);
  }

  doc.setPage(totalPgs);
  const finalY = doc.lastAutoTable.finalY + 6;
  if (finalY < pageH - 26) {
    const col1X = 14, col2X = pageW / 2 - 28, col3X = pageW - 70, baseY = finalY + 4;
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(30, 30, 30);
    doc.text("Prepared by/Date:", col1X, baseY);
    doc.setFont("helvetica", "normal");
    doc.text(` ${preparedBy} / ${dateStr}`, col1X + doc.getTextWidth("Prepared by/Date: "), baseY);
    doc.setFont("helvetica", "bold");
    doc.text("Received by Name/Date:", col1X, baseY + 12);
    doc.setDrawColor(120); doc.setLineWidth(0.25);
    doc.line(col1X, baseY + 17, col1X + 65, baseY + 17);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(30, 30, 30);
    doc.text("MELODY M. ZAMUDIO, RPh, MGM-ESP", col2X, baseY + 5, { align:"center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(60);
    doc.text("FDRO V/Chief, LRD", col2X, baseY + 10, { align:"center" });
    doc.text("Center for Drug Regulation and Research", col2X, baseY + 15, { align:"center" });
    doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(30, 30, 30);
    doc.text("NON-ACCEPTANCE AND SWITCHING", col3X, baseY + 10, { align:"center" });
    doc.text("REQUIRES PRIOR APPROVAL BY CHIEF LRD", col3X, baseY + 15, { align:"center" });
  }

  doc.save(`transmittal_${activeTab ?? "task"}_${now.toISOString().slice(0, 10)}.pdf`);
};

export const generateTransmittal = async (selectedData, activeTab) => {
  await generatePDF(selectedData, activeTab);
  await generateExcel(selectedData, activeTab);
};
