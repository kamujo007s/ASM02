// ManageAssets.js

import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ConfigProvider, theme, Form, Input, Button, Card, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { NotificationContext } from '../context/NotificationContext';

const ManageAssets = () => {
  const [asset, setAsset] = useState({
    device_name: '',
    application_name: '',
    operating_system: '',
    os_version: '',
    contact: '',
  });

  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const { addNotification } = useContext(NotificationContext);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const ws = new WebSocket(`ws://localhost:3012?token=${token}`);

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
        data = { type: 'text', message: event.data };
      }

      if (data.type === 'notification' || data.type === 'text') {
        toast.info(data.message, { position: 'top-right' });
        addNotification(data.message);
      } else if (data.type === 'progress') {
        // แสดงข้อความความคืบหน้า
        toast.info(data.message, { position: 'top-right', autoClose: false });
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [addNotification]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAsset({
      ...asset,
      [name]: value,
    });
  };

  const handleFileChange = (info) => {
    const { fileList } = info;
    setFile(fileList[0]);
  };

  const resetForm = () => {
    setAsset({
      device_name: '',
      application_name: '',
      operating_system: '',
      os_version: '',
      contact: '',
    });
    setFile(null);
    setIsUploading(false);
  };

  const handleSubmit = async (values) => {
    const id = toast.loading('Adding asset...', {
      autoClose: false,
      toastId: 'addingAsset',
    });
    setIsUploading(true);

    try {
      const token = localStorage.getItem('token');

      await axios.post('http://localhost:3012/api/assets', values, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.update(id, {
        render: 'Asset added successfully!',
        type: 'success',
        isLoading: false,
        autoClose: 5000,
      });

      addNotification(`Asset ${values.device_name} added successfully`);

    } catch (error) {
      console.error('Error adding asset:', error);
      toast.update(id, {
        render: 'Error adding asset',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsUploading(false);
      resetForm();
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload', { position: 'top-right' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file.originFileObj || file);

    setIsUploading(true);

    const id = toast.loading('Uploading file...', { position: 'top-right' });

    try {
      const token = localStorage.getItem('token');

      await axios.post('http://localhost:3012/api/assets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      toast.update(id, {
        render: 'File uploaded successfully',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
        position: 'top-right',
      });

      addNotification('File uploaded successfully');

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
    } finally {
      setIsUploading(false);
      resetForm();
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

        <Card
          title="Add Asset Manually"
          style={{ backgroundColor: '#ffffff', color: '#1f1f1f', marginBottom: '20px', width: '100%', maxWidth: '600px' }}
        >
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
            <Form.Item
              label="Contact Options"
              name="contact"
              rules={[{ required: false }]}
            >
              <Input name="contact" value={asset.contact} onChange={handleChange} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" disabled={isUploading}>
                Add Asset
              </Button>
            </Form.Item>
          </Form>

          <h3 style={{ textAlign: 'center', margin: '20px 0' }}>or Upload file</h3>

          <Upload beforeUpload={() => false} onChange={handleFileChange} maxCount={1} disabled={isUploading}>
            <Button icon={<UploadOutlined />} disabled={isUploading}>Select File</Button>
          </Upload>
          <Button type="primary" onClick={handleUpload} disabled={!file || isUploading} style={{ marginTop: '20px' }}>
            Upload
          </Button>
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default ManageAssets;