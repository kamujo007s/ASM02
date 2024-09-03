import React, { useState } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const UploadAsset = () => {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload', { position: "top-right" });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    // รีเซตฟอร์มทันทีเมื่อกดปุ่ม Upload
    setFile(null);
    document.getElementById('upload-form').reset();

    // แสดง toast ทันทีเมื่อเริ่มต้นการอัปโหลด
    const id = toast.loading('Uploading file...', { position: "top-right" });

    try {
      const response = await axios.post('/api/assets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload response:', response); // ตรวจสอบค่าที่ได้รับหลังจากการอัปโหลด

      toast.update(id, {
        render: 'File uploaded successfully',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
        position: "top-right",
      });

      try {
        const updateResponse = await axios.get('/cve/update'); // Fetch and map data after file upload
        console.log('CVE update response:', updateResponse);
        toast.success('Data updated successfully', { position: "top-right" });
      } catch (updateError) {
        console.error('Error updating CVE data:', updateError);
        toast.error('Failed to update CVE data after upload', { position: "top-right" });
      }

    } catch (error) {
      console.error('Error uploading file:', error);
      if (error.response) {
        toast.update(id, {
          render: error.response.data || 'Error uploading file',
          type: 'error',
          isLoading: false,
          autoClose: 3000,
          position: "top-right",
        });
      } else if (error.message === 'Network Error') {
        toast.update(id, {
          render: 'Network error, please check your connection',
          type: 'error',
          isLoading: false,
          autoClose: 3000,
          position: "top-right",
        });
      } else {
        toast.update(id, {
          render: 'Failed to upload file due to a server error',
          type: 'error',
          isLoading: false,
          autoClose: 3000,
          position: "top-right",
        });
      }
    }
  };

  return (
    <div className="container mt-5">
      <ToastContainer /> {/* สำหรับแสดง Toast */}
      <div className="card">
        <div className="card-header text-white" style={{ backgroundColor: '#0047BB' }}>
          Upload Asset
        </div>
        <div className="card-body">
          <form id="upload-form"> {/* ใช้ฟอร์มสำหรับรีเซต input */}
            <input 
              type="file" 
              onChange={handleFileChange} 
              className="form-control" 
            />
            <button type="button" onClick={handleUpload} className="btn btn-primary mt-3" disabled={!file}>
              Upload
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UploadAsset;
