import { AgreementData, DebtorRecord, StaffConfig } from '../types.ts';

const API_BASE = '/api';

export const DBService = {
  async getAgreements(): Promise<AgreementData[]> {
    try {
      const response = await fetch(`${API_BASE}/agreements`);
      if (!response.ok) throw new Error('Failed to fetch agreements');
      return await response.json();
    } catch (error) {
      console.error("[DBService] getAgreements error:", error);
      // Fallback to local storage for offline resilience if needed, 
      // but for cross-device we must rely on the server.
      const local = localStorage.getItem('kdb_agreements_fallback');
      return local ? JSON.parse(local) : [];
    }
  },

  async saveAgreement(agreement: AgreementData): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/agreements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agreement)
      });
      if (!response.ok) throw new Error('Failed to save agreement');
      
      // Update local fallback
      const agreements = await this.getAgreements();
      localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
    } catch (error) {
      console.error("[DBService] saveAgreement error:", error);
      throw error;
    }
  },

  async updateAgreement(id: string, updates: Partial<AgreementData>): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/agreements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update agreement');
      
      // Update local fallback
      const agreements = await this.getAgreements();
      localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
    } catch (error) {
      console.error("[DBService] updateAgreement error:", error);
      throw error;
    }
  },

  async deleteAgreement(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/agreements/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete agreement');
      
      // Update local fallback
      const agreements = await this.getAgreements();
      localStorage.setItem('kdb_agreements_fallback', JSON.stringify(agreements));
    } catch (error) {
      console.error("[DBService] deleteAgreement error:", error);
      throw error;
    }
  },

  async getDebtors(): Promise<DebtorRecord[]> {
    try {
      const response = await fetch(`${API_BASE}/debtors`);
      if (!response.ok) throw new Error('Failed to fetch debtors');
      return await response.json();
    } catch (error) {
      console.error("[DBService] getDebtors error:", error);
      const local = localStorage.getItem('kdb_debtors_fallback');
      return local ? JSON.parse(local) : [];
    }
  },

  async saveDebtors(debtors: DebtorRecord[]): Promise<void> {
    try {
      console.log(`[DBService] Saving ${debtors.length} debtors to server...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const payload = JSON.stringify(debtors);
      console.log(`[DBService] Payload size: ${payload.length} bytes`);

      const response = await fetch(`${API_BASE}/debtors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMsg = errorData.error;
          }
        } catch (e) {
          // If not JSON, try text
          const text = await response.text().catch(() => "");
          if (text) errorMsg = `${errorMsg} - ${text.substring(0, 100)}`;
        }
        
        console.error(`[DBService] ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      console.log("[DBService] Debtors saved successfully");
      localStorage.setItem('kdb_debtors_fallback', JSON.stringify(debtors));
    } catch (error) {
      console.error("[DBService] saveDebtors error:", error);
      throw error;
    }
  },

  async getStaffConfig(): Promise<StaffConfig> {
    try {
      const response = await fetch(`${API_BASE}/staff`);
      if (!response.ok) throw new Error('Failed to fetch staff config');
      return await response.json();
    } catch (error) {
      console.error("[DBService] getStaffConfig error:", error);
      const local = localStorage.getItem('kdb_staff_fallback');
      return local ? JSON.parse(local) : { officialSignature: '' };
    }
  },

  async saveStaffConfig(config: StaffConfig): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error('Failed to save staff config');
      
      localStorage.setItem('kdb_staff_fallback', JSON.stringify(config));
    } catch (error) {
      console.error("[DBService] saveStaffConfig error:", error);
      throw error;
    }
  }
};
