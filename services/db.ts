import { AgreementData, DebtorRecord, StaffConfig } from '../types.ts';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const API_BASE = '/api';

// Initialize Supabase client if environment variables are present
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error("[DBService] Supabase init error:", e);
  }
}

export const DBService = {
  isCloudEnabled(): boolean {
    return !!supabase;
  },

  async getAgreements(): Promise<AgreementData[]> {
    try {
      const response = await fetch(`${API_BASE}/agreements`);
      if (response.ok) return await response.json();
    } catch (error) {
      console.error("[DBService] getAgreements error:", error);
    }
    return [];
  },

  async saveAgreement(agreement: AgreementData): Promise<void> {
    // 1. Local Save
    const response = await fetch(`${API_BASE}/agreements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agreement)
    });
    if (!response.ok) throw new Error(`Save failed: ${response.status}`);

    // 2. Cloud Sync (Background)
    if (supabase) {
      supabase.from('agreements').insert(agreement).then(({ error }) => {
        if (error && error.code !== '23505') console.error("[DBService] Cloud sync error:", error);
      });
    }
  },

  async updateAgreement(id: string, updates: Partial<AgreementData>): Promise<void> {
    // 1. Local Update
    const response = await fetch(`${API_BASE}/agreements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error(`Update failed: ${response.status}`);

    // 2. Cloud Sync (Background)
    if (supabase) {
      supabase.from('agreements').update(updates).eq('id', id).then(({ error }) => {
        if (error) console.error("[DBService] Cloud update error:", error);
      });
    }
  },

  async deleteAgreement(id: string): Promise<void> {
    // 1. Local Delete
    const response = await fetch(`${API_BASE}/agreements/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete agreement');

    // 2. Cloud Delete (Background)
    if (supabase) {
      supabase.from('agreements').delete().eq('id', id).then(({ error }) => {
        if (error) console.error("[DBService] Cloud delete error:", error);
      });
    }
  },

  async forceSync(): Promise<void> {
    if (!supabase) throw new Error("Supabase not configured");
    const { data: agreements, error: aError } = await supabase.from('agreements').select('*');
    const { data: debtors, error: dError } = await supabase.from('debtors').select('*');
    if (aError) throw aError;
    if (dError) throw dError;

    if (agreements) {
      await fetch(`${API_BASE}/agreements/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agreements)
      });
    }
    if (debtors) {
      await this.saveDebtors(debtors);
    }
  },

  async getDebtors(): Promise<DebtorRecord[]> {
    try {
      const response = await fetch(`${API_BASE}/debtors`);
      if (response.ok) return await response.json();
    } catch (error) {
      console.error("[DBService] getDebtors error:", error);
    }
    return [];
  },

  async saveDebtors(debtors: DebtorRecord[]): Promise<void> {
    await fetch(`${API_BASE}/debtors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(debtors)
    });
  },

  async getStaffConfig(): Promise<StaffConfig> {
    try {
      const response = await fetch(`${API_BASE}/staff`);
      if (response.ok) return await response.json();
    } catch (error) {}
    return { officialSignature: '' };
  },

  async saveStaffConfig(config: StaffConfig): Promise<void> {
    await fetch(`${API_BASE}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
  }
};
