
import { AgreementData, KDB_ADMIN_EMAIL } from '../types.ts';

const getEnv = (key: string, fallback: string) => {
  return (window as any).env?.[key] || (process.env as any)?.[key] || fallback;
};

export const EmailService = {
  config: {
    SERVICE_ID: getEnv('EMAILJS_SERVICE_ID', ''), 
    TEMPLATE_ADMIN: getEnv('EMAILJS_TEMPLATE_ADMIN', ''),
    TEMPLATE_CLIENT: getEnv('EMAILJS_TEMPLATE_CLIENT', ''),
    PUBLIC_KEY: getEnv('EMAILJS_PUBLIC_KEY', ''),
    ACCESS_TOKEN: getEnv('EMAILJS_ACCESS_TOKEN', '') 
  },

  async sendAdminNotification(agreement: AgreementData) {
    if (!this.config.PUBLIC_KEY) {
      console.warn("[EmailJS] Public Key missing. Email skipped.");
      return false;
    }

    const templateParams = {
      to_name: "Faustine Kigunda",
      from_name: agreement.dboName,
      dbo_name: agreement.dboName,
      permit_no: agreement.permitNo,
      total_arrears: agreement.totalArrears.toLocaleString(),
      county: agreement.county,
      admin_email: KDB_ADMIN_EMAIL,
      portal_link: window.location.origin
    };

    try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: this.config.SERVICE_ID,
                template_id: this.config.TEMPLATE_ADMIN,
                user_id: this.config.PUBLIC_KEY,
                accessToken: this.config.ACCESS_TOKEN,
                template_params: templateParams
            })
        });
        
        return response.ok;
    } catch (e) {
        console.error("Admin Alert Network Error:", e);
        return false;
    }
  },

  async sendClientApproval(agreement: AgreementData) {
    if (!this.config.PUBLIC_KEY) return false;

    const templateParams = {
      to_email: agreement.clientEmail,
      dbo_name: agreement.dboName,
      execution_date: new Date().toLocaleDateString(),
      official_name: agreement.officialName || "Kenya Dairy Board",
      total_arrears: agreement.totalArrears.toLocaleString(),
      agreement_link: `${window.location.origin}/?id=${agreement.id}`
    };

    try {
        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                service_id: this.config.SERVICE_ID,
                template_id: this.config.TEMPLATE_CLIENT,
                user_id: this.config.PUBLIC_KEY,
                accessToken: this.config.ACCESS_TOKEN,
                template_params: templateParams
            })
        });
        
        return response.ok;
    } catch (e) {
        console.error("Client Notice Network Error:", e);
        return false;
    }
  }
};
