import React, { useState } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Upload, Button, Card, ConfigProvider, theme } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const UploadAsset = () => {
  const [file, setFile] = useState(null);

  const handleFileChange = ({ file }) => {
    setFile(file.originFileObj);
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

    // แสดง toast ทันทีเมื่อเริ่มต้นการอัปโหลด
    const id = toast.loading('Uploading file...', { position: "top-right" });

    try {
      const response = await axios.post('http://localhost:3012/api/assets/upload', formData, {
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
        const updateResponse = await axios.get('http://192.168.123.180:3012/cve/update'); // Fetch and map data after file upload
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
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm, // Use default (light) theme
        token: {
          colorPrimary: "#1677ff",
          colorInfo: "#1677ff",
          borderRadius: 6,
          wireframe: false,
        },
      }}
    >
      <div className="container mt-5">
        <ToastContainer /> {/* สำหรับแสดง Toast */}
        <Card title="Upload Asset" style={{ backgroundColor: '#fff', color: '#1f1f1f' }}>
          <Upload 
            beforeUpload={() => true} // Disable automatic upload
            onChange={handleFileChange}
            maxCount={1} // Allow only one file at a time
          >
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
          <Button 
            type="primary" 
            onClick={handleUpload} 
            disabled={!file} 
            style={{ marginTop: '20px' }}
          >
            Upload
          </Button>
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default UploadAsset;