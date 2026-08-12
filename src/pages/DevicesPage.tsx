import React, { useEffect } from 'react';
import { useDeviceStore } from '../store/useDeviceStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { Monitor, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const DevicesPage = () => {
  const { devices, loading, fetchDevices, updateDeviceStatus, assignDevice, enrollDevice } = useDeviceStore();
  const { members } = useWorkspaceStore();

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <CheckCircle className="text-green-500" size={16} />;
      case 'SUSPENDED': return <AlertCircle className="text-yellow-500" size={16} />;
      case 'REVOKED': return <XCircle className="text-red-500" size={16} />;
      default: return <Clock className="text-gray-500" size={16} />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-50 text-green-700 border-green-200';
      case 'SUSPENDED': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'REVOKED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleEnrollDevice = async () => {
    if (!window.electronAPI) {
      alert('Device enrollment must be performed inside the Desktop Application.');
      return;
    }
    
    try {
      const isAlreadyEnrolled = await window.electronAPI.isEnrolled();
      if (isAlreadyEnrolled) {
        alert('This device is already enrolled. Please revoke it first if you want to re-enroll.');
        return;
      }

      const deviceName = `Device - ${new Date().toLocaleDateString()}`;

      const result = await window.electronAPI.enroll();
      if (result.success && result.publicKey) {
        const deviceCode = 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        await enrollDevice(deviceCode, deviceName, result.publicKey);
        alert('Device enrolled successfully!');
      } else {
        alert('Enrollment failed: ' + result.error);
      }
    } catch (err: any) {
      alert('Enrollment failed: ' + err.message);
    }
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center">
            <Monitor className="mr-2 text-brand" size={24} />
            Device Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage physical devices authorized for attendance</p>
        </div>
        <button
          className="bg-brand text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-brand/90 transition-colors shadow-sm flex items-center"
          onClick={handleEnrollDevice}
        >
          <Monitor size={16} className="mr-2" />
          Enroll New Device
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No devices registered yet.
                  </td>
                </tr>
              ) : (
                devices.map(device => (
                  <tr key={device.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 mr-3">
                          <Monitor size={20} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{device.device_name}</div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">{device.device_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-brand focus:ring focus:ring-brand focus:ring-opacity-50"
                        value={device.assigned_employee_id || ''}
                        onChange={(e) => assignDevice(device.id, e.target.value || null)}
                      >
                        <option value="">-- Unassigned --</option>
                        {members.map(m => (
                          <option key={m.user_id} value={m.user_id}>
                            {m.user?.name || m.user?.email || 'Unknown User'}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(device.status)}`}>
                        <span className="mr-1.5">{getStatusIcon(device.status)}</span>
                        {device.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {device.status !== 'ACTIVE' && (
                          <button onClick={() => updateDeviceStatus(device.id, 'ACTIVE')} className="text-green-600 hover:text-green-900">Activate</button>
                        )}
                        {device.status === 'ACTIVE' && (
                          <button onClick={() => updateDeviceStatus(device.id, 'SUSPENDED')} className="text-yellow-600 hover:text-yellow-900">Suspend</button>
                        )}
                        {device.status !== 'REVOKED' && (
                          <button onClick={() => updateDeviceStatus(device.id, 'REVOKED')} className="text-red-600 hover:text-red-900">Revoke</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DevicesPage;
