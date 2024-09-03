import React, { useState } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AddAssetManual = () => {
  const [asset, setAsset] = useState({
    device_name: '',
    application_name: '',
    operating_system: '',
    os_version: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAsset({
      ...asset,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // แสดง toast ว่ากำลังดำเนินการ
    const id = toast.loading('Adding asset...', {
      autoClose: false, // ไม่ปิดอัตโนมัติจนกว่าจะเพิ่มเสร็จ
      toastId: 'addingAsset', // เพื่อให้ toast นี้เป็น unique และสามารถอัพเดตได้
    });

    try {
      await axios.post('/api/assets', asset);
      toast.update(id, {
        render: 'Asset added successfully!',
        type: toast.TYPE.SUCCESS,
        isLoading: false,
        autoClose: 5000,
      });
      setAsset({ device_name: '', application_name: '', operating_system: '', os_version: '' }); // Reset form

      try {
        await axios.get('/cve/update');
        toast.success('CVE data updated successfully!', { position: "top-right" });
      } catch (updateError) {
        console.error('Error updating CVE data:', updateError);
        toast.error('Failed to update CVE data after adding asset', { position: "top-right" });
      }

    } catch (error) {
      console.error('Error adding asset:', error);
      toast.update('addingAsset', {
        render: 'Error adding asset',
        type: toast.TYPE.ERROR,
        isLoading: false,
        autoClose: 5000,
      });
    }
  };

  return (
    <div className="container mt-5">
      <ToastContainer /> {/* สำหรับแสดง Toast */}
      <div className="card">
        <div className="card-header text-white" style={{ backgroundColor: '#0047BB' }}>
          Add Asset Manually
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="device_name">Asset Name</label>
              <input
                type="text"
                className="form-control"
                id="device_name"
                name="device_name"
                value={asset.device_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="application_name">Application</label>
              <input
                type="text"
                className="form-control"
                id="application_name"
                name="application_name"
                value={asset.application_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="operating_system">Operating System</label>
              <input
                type="text"
                className="form-control"
                id="operating_system"
                name="operating_system"
                value={asset.operating_system}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="os_version">Version</label>
              <input
                type="text"
                className="form-control"
                id="os_version"
                name="os_version"
                value={asset.os_version}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary mt-2">Add Asset</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddAssetManual;
