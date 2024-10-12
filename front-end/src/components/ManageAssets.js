// ManageAssets.js 
import React, { useState, useContext } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ConfigProvider, theme, Form, Input, Button, Card, Upload, Progress } from 'antd'; // นำเข้า Progress
import { UploadOutlined } from '@ant-design/icons';
import { NotificationContext } from '../context/NotificationContext';

const ManageAssets = () => {
  const [asset, setAsset] = useState({
    device_name: '',
    application_name: '',
    operating_system: '',
    os_version: '',
  });

  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0); // สำหรับเก็บเปอร์เซ็นต์การอัปโหลด
  const [cveProgress, setCveProgress] = useState(0); // สำหรับเก็บเปอร์เซ็นต์การดึงข้อมูล CVE
  const { addNotification } = useContext(NotificationContext);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAsset({
      ...asset,
      [name]: value,
    });
  };

  const handleFileChange = ({ file }) => {
    setFile(file.originFileObj);
  };

  const resetForm = () => {
    setAsset({
      device_name: '',
      application_name: '',
      operating_system: '',
      os_version: '',
    });
    setFile(null);
    setUploadProgress(0);
    setCveProgress(0);
  };

  const handleSubmit = async (values) => {
    const id = toast.loading('Adding asset...', {
      autoClose: false,
      toastId: 'addingAsset',
    });

    try {
      const token = localStorage.getItem('token');

      await axios.post('http://localhost:3012/api/assets', values, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // อัปเดต Toast และรีเซ็ตฟอร์ม
      toast.update(id, {
        render: 'Asset added successfully!',
        type: 'success',
        isLoading: false,
        autoClose: 5000,
      });

      resetForm(); // รีเซ็ตฟอร์มหลังจากเพิ่มสินทรัพย์เสร็จสิ้น

      // เพิ่มการแจ้งเตือน
      addNotification(`Asset ${values.device_name} added successfully`);

      // Fetch CVE data for the newly added asset and show progress
      try {
        const totalCve = 100; // สมมติว่าดึงข้อมูล CVE ได้ 100 รายการ
        let currentProgress = 0;
        const interval = setInterval(() => {
          currentProgress += 1; // จำลองการเพิ่มเปอร์เซ็นต์การดึงข้อมูล
          setCveProgress((currentProgress / totalCve) * 100);
          if (currentProgress >= totalCve) {
            clearInterval(interval);
          }
        }, 500); // อัปเดตทุก 500ms

        await axios.get(`http://localhost:3012/cve/update?device_name=${values.device_name}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        toast.success('CVE data updated successfully for the new asset!', { position: 'top-right' });
      } catch (updateError) {
        console.error('Error updating CVE data for the new asset:', updateError);
        toast.error('Failed to update CVE data for the new asset', { position: 'top-right' });
      }
    } catch (error) {
      console.error('Error adding asset:', error);
      toast.update(id, {
        render: 'Error adding asset',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload', { position: 'top-right' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadProgress(0); // รีเซ็ตเปอร์เซ็นต์การอัปโหลด

    const id = toast.loading('Uploading file...', { position: 'top-right' });

    try {
      const token = localStorage.getItem('token');

      const response = await axios.post('http://localhost:3012/api/assets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted); // อัปเดตเปอร์เซ็นต์การอัปโหลด

          // อัปเดต Progress bar ใน toast
          toast.update(id, {
            render: <Progress percent={uploadProgress} />,
            isLoading: true,
            autoClose: false,
          });
        },
      });

      console.log('Upload response:', response);

      // อัปเดต Toast และรีเซ็ตฟอร์ม
      toast.update(id, {
        render: 'File uploaded successfully',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
        position: 'top-right',
      });

      resetForm(); // รีเซ็ตฟอร์มหลังจากการอัปโหลดเสร็จสิ้น

      // เพิ่มการแจ้งเตือน
      addNotification('File uploaded successfully');

      // Fetch CVE data for the newly uploaded assets only
      try {
        const updateResponse = await axios.get('http://localhost:3012/cve/update', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log('CVE update response:', updateResponse);
        toast.success('Data updated successfully for the new assets', { position: 'top-right' });
      } catch (updateError) {
        console.error('Error updating CVE data for the new assets:', updateError);
        toast.error('Failed to update CVE data for the new assets', { position: 'top-right' });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      if (error.response) {
        toast.update(id, {
          render: error.response.data || 'Error uploading file',
          type: 'error',
          isLoading: false,
          autoClose: 3000,
          position: 'top-right',
        });
      } else if (error.message === 'Network Error') {
        toast.update(id, {
          render: 'Network error, please check your connection',
          type: 'error',
          isLoading: false,
          autoClose: 3000,
          position: 'top-right',
        });
      } else {
        toast.update(id, {
          render: 'Failed to upload file due to a server error',
          type: 'error',
          isLoading: false,
          autoClose: 3000,
          position: 'top-right',
        });
      }
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 5,
          colorBgContainer: '#ffffff',
          colorTextBase: '#1f1f1f',
        },
      }}
    >
      <div className="container mt-5" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <ToastContainer />

        <Card title="Add Asset Manually" style={{ backgroundColor: '#ffffff', color: '#1f1f1f', marginBottom: '20px', width: '100%', maxWidth: '600px' }}>
          <Form onFinish={handleSubmit} layout="vertical">
            <Form.Item
              label="Asset Name"
              name="device_name"
              rules={[{ required: true, message: 'Please input the asset name!' }]}
            >
              <Input name="device_name" value={asset.device_name} onChange={handleChange} />
            </Form.Item>
            <Form.Item
              label="Application"
              name="application_name"
              rules={[{ required: true, message: 'Please input the application name!' }]}
            >
              <Input name="application_name" value={asset.application_name} onChange={handleChange} />
            </Form.Item>
            <Form.Item
              label="Operating System"
              name="operating_system"
              rules={[{ required: true, message: 'Please input the operating system!' }]}
            >
              <Input name="operating_system" value={asset.operating_system} onChange={handleChange} />
            </Form.Item>
            <Form.Item
              label="Version"
              name="os_version"
              rules={[{ required: true, message: 'Please input the OS version!' }]}
            >
              <Input name="os_version" value={asset.os_version} onChange={handleChange} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">Add Asset</Button>
            </Form.Item>
          </Form>

          <h3 style={{ textAlign: 'center', margin: '20px 0' }}>or Upload file</h3>

          <Upload beforeUpload={() => true} onChange={handleFileChange} maxCount={1}>
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
          <Button type="primary" onClick={handleUpload} disabled={!file} style={{ marginTop: '20px' }}>
            Upload
          </Button>

          {uploadProgress > 0 && (
            <Progress percent={uploadProgress} style={{ marginTop: '20px' }} /> // แสดง Progress bar สำหรับการอัปโหลด
          )}

          {cveProgress > 0 && (
            <Progress percent={cveProgress} style={{ marginTop: '20px' }} /> // แสดง Progress bar การดึงข้อมูล CVE
          )}
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default ManageAssets;
