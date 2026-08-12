import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Device, DeviceStatus } from '../types';

interface DeviceState {
  devices: Device[];
  loading: boolean;
  fetchDevices: () => Promise<void>;
  updateDeviceStatus: (id: string, status: DeviceStatus) => Promise<void>;
  assignDevice: (id: string, employeeId: string | null) => Promise<void>;
  enrollDevice: (deviceCode: string, deviceName: string, publicKey: string) => Promise<void>;
}

export const useDeviceStore = create<DeviceState>((set, get) => ({
  devices: [],
  loading: false,

  fetchDevices: async () => {
    try {
      set({ loading: true });
      const { data, error } = await supabase.from('devices').select('*').order('registered_at', { ascending: false });
      if (error) throw error;
      set({ devices: data || [], loading: false });
    } catch (err) {
      console.error('Error fetching devices:', err);
      set({ loading: false });
    }
  },

  updateDeviceStatus: async (id, status) => {
    try {
      const { error } = await supabase.from('devices').update({ status }).eq('id', id);
      if (error) throw error;
      await get().fetchDevices();
    } catch (err) {
      console.error('Error updating device status:', err);
      alert('Failed to update status');
    }
  },

  assignDevice: async (id, employeeId) => {
    try {
      const { error } = await supabase.from('devices').update({ assigned_employee_id: employeeId }).eq('id', id);
      if (error) throw error;
      await get().fetchDevices();
    } catch (err) {
      console.error('Error assigning device:', err);
      alert('Failed to assign device');
    }
  },

  enrollDevice: async (deviceCode, deviceName, publicKey) => {
    try {
      const { error } = await supabase.from('devices').insert([{
        device_code: deviceCode,
        device_name: deviceName,
        public_key: publicKey,
        status: 'PENDING'
      }]);
      if (error) throw error;
      await get().fetchDevices();
    } catch (err) {
      console.error('Error enrolling device:', err);
      alert('Failed to enroll device');
    }
  }
}));
