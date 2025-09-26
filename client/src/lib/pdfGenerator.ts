import jsPDF from 'jspdf';

interface ContractData {
  title: string;
  type: string;
  data: any;
  collaborators?: any[];
  createdAt: string;
}

export function generateContractPDF(contract: ContractData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize = 11) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * fontSize * 0.5);
  };

  // Header
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('SPLITFY', margin, yPosition);
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text('Music Contract Management Platform', margin, yPosition + 10);
  
  // Title
  yPosition += 30;
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  yPosition = addWrappedText(contract.title.toUpperCase(), margin, yPosition, contentWidth, 18);
  
  // Contract type and date
  yPosition += 15;
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Contract Type: ${contract.type.replace('-', ' ').toUpperCase()}`, margin, yPosition);
  doc.text(`Date: ${new Date(contract.createdAt).toLocaleDateString()}`, pageWidth - margin - 50, yPosition);
  
  // Horizontal line
  yPosition += 10;
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  // Contract details based on type
  if (contract.type === 'split-sheet') {
    // Song details
    doc.setFont(undefined, 'bold');
    doc.text('SONG DETAILS', margin, yPosition);
    yPosition += 10;
    
    doc.setFont(undefined, 'normal');
    if (contract.data.title) {
      doc.text(`Song Title: ${contract.data.title}`, margin, yPosition);
      yPosition += 8;
    }
    if (contract.data.releaseDate) {
      doc.text(`Release Date: ${new Date(contract.data.releaseDate).toLocaleDateString()}`, margin, yPosition);
      yPosition += 8;
    }
    
    // Collaborators section
    yPosition += 10;
    doc.setFont(undefined, 'bold');
    doc.text('COLLABORATORS & OWNERSHIP', margin, yPosition);
    yPosition += 10;
    
    if (contract.data.collaborators && Array.isArray(contract.data.collaborators)) {
      contract.data.collaborators.forEach((collab: any, index: number) => {
        doc.setFont(undefined, 'normal');
        doc.text(`${index + 1}. ${collab.name}`, margin, yPosition);
        doc.text(`Role: ${collab.role}`, margin + 80, yPosition);
        doc.text(`Ownership: ${collab.ownershipPercentage}%`, margin + 140, yPosition);
        yPosition += 8;
      });
    }
    
    // Revenue distribution
    yPosition += 10;
    doc.setFont(undefined, 'bold');
    doc.text('REVENUE DISTRIBUTION', margin, yPosition);
    yPosition += 10;
    
    doc.setFont(undefined, 'normal');
    doc.text(`Performance Royalties: ${contract.data.performanceRoyalties || 'Split equally'}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Mechanical Royalties: ${contract.data.mechanicalRoyalties || 'Split equally'}`, margin, yPosition);
    yPosition += 15;
  }
  
  if (contract.type === 'performance') {
    doc.setFont(undefined, 'bold');
    doc.text('PERFORMANCE DETAILS', margin, yPosition);
    yPosition += 10;
    
    doc.setFont(undefined, 'normal');
    if (contract.data.venue) {
      doc.text(`Venue: ${contract.data.venue}`, margin, yPosition);
      yPosition += 8;
    }
    if (contract.data.eventDate) {
      doc.text(`Date & Time: ${new Date(contract.data.eventDate).toLocaleString()}`, margin, yPosition);
      yPosition += 8;
    }
    if (contract.data.performanceFee) {
      doc.text(`Performance Fee: $${contract.data.performanceFee}`, margin, yPosition);
      yPosition += 8;
    }
    
    if (contract.data.technicalRequirements) {
      yPosition += 10;
      doc.setFont(undefined, 'bold');
      doc.text('TECHNICAL REQUIREMENTS', margin, yPosition);
      yPosition += 10;
      doc.setFont(undefined, 'normal');
      yPosition = addWrappedText(contract.data.technicalRequirements, margin, yPosition, contentWidth);
      yPosition += 10;
    }
  }
  
  if (contract.type === 'producer') {
    doc.setFont(undefined, 'bold');
    doc.text('PRODUCTION DETAILS', margin, yPosition);
    yPosition += 10;
    
    doc.setFont(undefined, 'normal');
    if (contract.data.producerName) {
      doc.text(`Producer: ${contract.data.producerName}`, margin, yPosition);
      yPosition += 8;
    }
    if (contract.data.beatPrice) {
      doc.text(`Beat Price: $${contract.data.beatPrice}`, margin, yPosition);
      yPosition += 8;
    }
    if (contract.data.royaltyPercentage) {
      doc.text(`Royalty Percentage: ${contract.data.royaltyPercentage}%`, margin, yPosition);
      yPosition += 8;
    }
    if (contract.data.creditRequirement) {
      doc.text(`Credit Requirement: ${contract.data.creditRequirement}`, margin, yPosition);
      yPosition += 8;
    }
  }
  
  if (contract.type === 'management') {
    doc.setFont(undefined, 'bold');
    doc.text('MANAGEMENT DETAILS', margin, yPosition);
    yPosition += 10;
    
    doc.setFont(undefined, 'normal');
    if (contract.data.managerName) {
      doc.text(`Manager: ${contract.data.managerName}`, margin, yPosition);
      yPosition += 8;
    }
    if (contract.data.commissionRate) {
      doc.text(`Commission Rate: ${contract.data.commissionRate}%`, margin, yPosition);
      yPosition += 8;
    }
    if (contract.data.contractDuration) {
      doc.text(`Contract Duration: ${contract.data.contractDuration}`, margin, yPosition);
      yPosition += 8;
    }
    
    if (contract.data.responsibilities) {
      yPosition += 10;
      doc.setFont(undefined, 'bold');
      doc.text('MANAGER RESPONSIBILITIES', margin, yPosition);
      yPosition += 10;
      doc.setFont(undefined, 'normal');
      yPosition = addWrappedText(contract.data.responsibilities, margin, yPosition, contentWidth);
      yPosition += 10;
    }
  }
  
  // Additional terms
  if (contract.data.additionalTerms) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.setFont(undefined, 'bold');
    doc.text('ADDITIONAL TERMS', margin, yPosition);
    yPosition += 10;
    doc.setFont(undefined, 'normal');
    yPosition = addWrappedText(contract.data.additionalTerms, margin, yPosition, contentWidth);
    yPosition += 15;
  }
  
  // Legal disclaimer
  if (yPosition > 220) {
    doc.addPage();
    yPosition = margin;
  }
  
  doc.setFont(undefined, 'bold');
  doc.text('LEGAL DISCLAIMER', margin, yPosition);
  yPosition += 10;
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  const disclaimer = 'This contract was generated using Splitfy. Please review all terms carefully and consult with a qualified attorney before signing. Splitfy is not responsible for the legal validity or enforceability of this agreement.';
  yPosition = addWrappedText(disclaimer, margin, yPosition, contentWidth, 10);
  
  // Footer
  const footerY = doc.internal.pageSize.height - 20;
  doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
  doc.setFontSize(10);
  doc.text('Generated by Splitfy - Music Contract Management Platform', margin, footerY);
  doc.text(new Date().toLocaleDateString(), pageWidth - margin - 30, footerY);
  
  return doc;
}

export function downloadContractPDF(contract: ContractData) {
  const doc = generateContractPDF(contract);
  const filename = `${contract.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_contract.pdf`;
  doc.save(filename);
}
