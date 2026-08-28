import jsPDF from "jspdf";
import QRCode from "qrcode";

export async function confirmationQrDataUrl(confirmUrl: string): Promise<string> {
  return QRCode.toDataURL(confirmUrl, {
    width: 320,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#1a1d2e", light: "#ffffff" },
  });
}

export async function downloadRightsCapturePdf(opts: {
  confirmUrl: string;
  projectName: string;
  contributorName: string;
}): Promise<void> {
  const qr = await confirmationQrDataUrl(opts.confirmUrl);
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 56;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SPLITSHEET", pageW / 2, y, { align: "center" });
  y += 22;
  doc.setFontSize(12);
  doc.text("RIGHTS CAPTURE", pageW / 2, y, { align: "center" });
  y += 28;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Scan to review and confirm your contribution.", pageW / 2, y, { align: "center" });
  y += 24;

  const qrSize = 220;
  doc.addImage(qr, "PNG", (pageW - qrSize) / 2, y, qrSize, qrSize);
  y += qrSize + 28;

  doc.setFontSize(11);
  doc.text(`Project: ${opts.projectName}`, 72, y);
  y += 18;
  doc.text(`Contributor: ${opts.contributorName}`, 72, y);
  y += 36;

  doc.setFontSize(9);
  doc.setTextColor(90);
  const note = doc.splitTextToSize(
    "QR Rights Capture provides a convenient way for contributors to access a SplitSheet confirmation workflow from a mobile device. SplitSheet is not a law firm and does not provide legal advice. Use of this QR code does not guarantee the enforceability of an agreement.",
    pageW - 144,
  );
  doc.text(note, 72, y);

  const safe = opts.contributorName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "contributor";
  doc.save(`splitsheet-rights-capture-${safe}.pdf`);
}
