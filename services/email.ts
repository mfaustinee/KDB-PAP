
import { AgreementData, KDB_ADMIN_EMAIL } from '../types.ts';
import { jsPDF } from 'jspdf';
import emailjs from '@emailjs/browser';

const getEnv = (key: string, fallback: string) => {
  return import.meta.env[key] || fallback;
};

// KDB Logo URL
const KDB_LOGO_URL = "https://www.kdb.go.ke/wp-content/uploads/2021/06/KDB-Logo.png";

export const generateAgreementPDF = async (agreement: AgreementData): Promise<string | null> => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add Logo
    try {
      // We attempt to add the logo.
      doc.addImage(KDB_LOGO_URL, 'PNG', pageWidth / 2 - 25, 10, 50, 25);
    } catch (e) {
      console.warn("Logo could not be added to PDF:", e);
    }

    doc.setLineWidth(0.5);
    doc.line(20, 40, pageWidth - 20, 40);
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT AGREEMENT FORM", pageWidth / 2, 50, { align: 'center' });
    doc.text("CONSUMER SAFETY LEVY ARREARS", pageWidth / 2, 58, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const dateObj = new Date(agreement.date);
    doc.text(`This Payment Agreement is entered into on this ${dateObj.getDate()} day of ${dateObj.toLocaleString('default', { month: 'long' })} ${dateObj.getFullYear()} between:`, 20, 70);
    
    doc.setFont("helvetica", "bold");
    doc.text("The Kenya Dairy Board (hereafter referred to as \"KDB\")", 20, 80);
    doc.setFont("helvetica", "normal");
    doc.text("and the following Dairy Business Operator (DBO):", 20, 85);
    
    let y = 95;
    const details = [
      ["DBO Name:", agreement.dboName || 'N/A'],
      ["Premise Name:", agreement.premiseName || 'N/A'],
      ["Regulatory Permit No:", agreement.permitNo || 'N/A'],
      ["Premise Location:", `${agreement.location || 'N/A'} | County: ${agreement.county || 'N/A'}`],
      ["Tel:", agreement.tel || 'N/A']
    ];

    details.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, 65, y);
      y += 7;
    });

    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text("1. PURPOSE OF AGREEMENT", 20, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    const purposeText = `This agreement outlines the payment schedule for outstanding, undisputed levy arrears amounting to Kenya Shillings ${agreement.totalArrearsWords || ''} (KES ${agreement.totalArrears.toLocaleString()}) owed by the above-named operator for the period of ${agreement.arrearsPeriod || 'N/A'}.`;
    const splitPurpose = doc.splitTextToSize(purposeText, pageWidth - 40);
    doc.text(splitPurpose, 20, y);
    y += splitPurpose.length * 5 + 2;
    doc.text(`Debit Note No: ${agreement.debitNoteNo || 'N/A'}`, 20, y);

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("2. PAYMENT SCHEDULE", 20, y);
    y += 7;
    
    // Table Header
    doc.setFillColor(245, 245, 245);
    doc.rect(20, y, pageWidth - 40, 8, 'F');
    doc.setFontSize(9);
    doc.text("Inst No.", 25, y + 5);
    doc.text("CSL Period", 50, y + 5);
    doc.text("Due Date", 100, y + 5);
    doc.text("Amount (KES)", pageWidth - 25, y + 5, { align: 'right' });
    y += 8;

    agreement.installments.forEach((inst) => {
      doc.setFont("helvetica", "normal");
      doc.text(String(inst.no), 25, y + 5);
      doc.text(inst.period, 50, y + 5);
      doc.setFont("helvetica", "bold");
      doc.text(inst.dueDate || 'TBD', 100, y + 5);
      doc.text(inst.amount.toLocaleString(), pageWidth - 25, y + 5, { align: 'right' });
      y += 8;
    });

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL ARREARS DUE:", 100, y + 5);
    doc.text(`KES ${agreement.totalArrears.toLocaleString()}`, pageWidth - 25, y + 5, { align: 'right' });
    y += 15;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("3. TERMS AND CONDITIONS", 20, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const terms = [
      "a) The DBO acknowledges, agrees to, and does not dispute the levy amount indicated herein.",
      "b) Payments shall be made to the designated KDB Bank Account or via the E-Citizen Collection account.",
      "c) The DBO shall submit proof of each payment immediately upon settlement.",
      "d) Failure to honor ANY installment within 7 days of its due date shall void this agreement.",
      "e) KDB reserves the right to initiate legal or enforcement action upon breach.",
      "f) Permit renewals will not be processed while any part of this debt remains outstanding."
    ];
    terms.forEach(term => {
      doc.text(term, 20, y);
      y += 4;
    });

    y += 10;
    // Signatures
    const sigY = y;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("FOR: KENYA DAIRY BOARD", 20, sigY);
    doc.text(`FOR DBO: ${agreement.dboName}`, pageWidth / 2 + 10, sigY);
    
    y += 10;
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${agreement.officialName || '....................'}`, 20, y);
    doc.text(`Name: ${agreement.clientName}`, pageWidth / 2 + 10, y);
    y += 7;
    doc.text("Title: Accounts Assistant", 20, y);
    doc.text(`Title: ${agreement.clientTitle}`, pageWidth / 2 + 10, y);
    
    y += 5;
    if (agreement.officialSignature) {
      try {
        doc.addImage(agreement.officialSignature, 'PNG', 20, y, 40, 15);
      } catch (e) {}
    }
    if (agreement.clientSignature) {
      try {
        doc.addImage(agreement.clientSignature, 'PNG', pageWidth / 2 + 10, y, 40, 15);
      } catch (e) {}
    }

    y += 10;
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setFont("courier", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`DOC_ID: ${agreement.id.toUpperCase()} | GEN_TIME: ${new Date().toISOString()}`, 20, pageHeight - 10);
    doc.text("OFFICIAL DOCUMENT", pageWidth - 20, pageHeight - 10, { align: 'right' });

    const output = doc.output('datauristring');
    return output.includes(',') ? output.split(',')[1] : null;
  } catch (e) {
    console.error("PDF Generation Error:", e);
    return null;
  }
};

export const EmailService = {
  config: {
    SERVICE_ID: getEnv('VITE_EMAILJS_SERVICE_ID', 'service_llhl7pf'), 
    TEMPLATE_ADMIN: getEnv('VITE_EMAILJS_TEMPLATE_ADMIN', 'template_submission_aler'),
    TEMPLATE_CLIENT: getEnv('VITE_EMAILJS_TEMPLATE_CLIENT', 'template_approval_notice'),
    PUBLIC_KEY: getEnv('VITE_EMAILJS_PUBLIC_KEY', ''),
  },

  async sendAdminNotification(agreement: AgreementData) {
    try {
      if (!this.config.PUBLIC_KEY) {
        console.warn("[EmailJS] Public Key missing. Email skipped.");
        return false;
      }

      const pdfBase64 = await generateAgreementPDF(agreement);

      const templateParams = {
        to_email: KDB_ADMIN_EMAIL,
        to_name: "Faustine Kigunda",
        from_name: agreement.dboName,
        dbo_name: agreement.dboName,
        permit_no: agreement.permitNo,
        total_arrears: (agreement.totalArrears || 0).toLocaleString(),
        county: agreement.county,
        admin_email: KDB_ADMIN_EMAIL,
        portal_link: window.location.origin,
        submission_type: agreement.status === 'resubmission_requested' ? 'RE-SUBMISSION REQUEST' : 'NEW AGREEMENT SUBMISSION',
        reason: agreement.resubmissionReason || 'N/A',
        content: pdfBase64 || '' 
      };

      const result = await emailjs.send(
        this.config.SERVICE_ID,
        this.config.TEMPLATE_ADMIN,
        templateParams,
        this.config.PUBLIC_KEY
      );
      
      return result.status === 200;
    } catch (e) {
        console.error("Admin Alert Error:", e);
        return false;
    }
  },

  async sendClientApproval(agreement: AgreementData) {
    if (!this.config.PUBLIC_KEY) return false;

    const pdfBase64 = await generateAgreementPDF(agreement);

    const templateParams = {
      to_email: agreement.clientEmail,
      dbo_name: agreement.dboName,
      execution_date: new Date().toLocaleDateString(),
      official_name: agreement.officialName || "Kenya Dairy Board",
      total_arrears: agreement.totalArrears.toLocaleString(),
      agreement_link: `${window.location.origin}/?id=${agreement.id}`,
      status_message: "Your agreement has been approved and signed by KDB.",
      content: pdfBase64 
    };

    try {
        const result = await emailjs.send(
          this.config.SERVICE_ID,
          this.config.TEMPLATE_CLIENT,
          templateParams,
          this.config.PUBLIC_KEY
        );
        
        return result.status === 200;
    } catch (e) {
        console.error("Client Notice Error:", e);
        return false;
    }
  },

  async sendClientRejection(agreement: AgreementData) {
    if (!this.config.PUBLIC_KEY) return false;

    const pdfBase64 = await generateAgreementPDF(agreement);

    const templateParams = {
      to_email: agreement.clientEmail,
      dbo_name: agreement.dboName,
      execution_date: new Date().toLocaleDateString(),
      official_name: "Kenya Dairy Board",
      total_arrears: agreement.totalArrears.toLocaleString(),
      status_message: agreement.rejectionReason || "Your submission has been reviewed and requires changes.",
      agreement_link: `${window.location.origin}`,
      content: pdfBase64 
    };

    try {
        const result = await emailjs.send(
          this.config.SERVICE_ID,
          this.config.TEMPLATE_CLIENT,
          templateParams,
          this.config.PUBLIC_KEY
        );
        
        return result.status === 200;
    } catch (e) {
        console.error("Client Rejection Error:", e);
        return false;
    }
  }
};
