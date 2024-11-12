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
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    // Fetch CSRF token when component mounts
    const fetchCsrfToken = async () => {
      try {
        const response = await axios.get('http://localhost:3012/api/csrf-token', {
          withCredentials: true,
        });
        setCsrfToken(response.data.csrfToken);
      } catch (error) {
        console.error('Error fetching CSRF token:', error);
      }
    };

    fetchCsrfToken();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAsset({
      ...asset,
      [name]: value,
    });
  };

  const handleFileChange = (info) => {
    const { fileList } = info;
    if (fileList.length > 0) {
      const fileSize = fileList[0].size;
      const allowedSize = 5 * 1024 * 1024; // Maximum size 5MB
      const allowedTypes = [
        'text/csv',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];

      if (fileSize > allowedSize) {
        toast.error('File is too large, maximum size is 5MB', { position: 'top-right' });
        setFile(null);
      } else if (!allowedTypes.includes(fileList[0].type)) {
        toast.error('Invalid file type, only CSV and Excel are allowed', { position: 'top-right' });
        setFile(null);
      } else {
        setFile(fileList[0]);
      }
    } else {
      setFile(null);
    }
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
      await axios.post('http://localhost:3012/api/assets', values, {
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        withCredentials: true, // Automatically send cookies
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
      await axios.post('http://localhost:3012/api/assets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-CSRF-Token': csrfToken,
        },
        withCredentials: true, // Automatically send cookies
      });

      toast.update(id, {
        render: 'File uploaded successfully',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
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
        });
      } else if (error.message === 'Network Error') {
        toast.update(id, {
          render: 'Network error, please check your connection',
          type: 'error',
          isLoading: false,
          autoClose: 3000,
        });
      } else {
        toast.update(id, {
          render: 'Failed to upload file due to a server error',
          type: 'error',
          isLoading: false,
          autoClose: 3000,
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
          style={{
            backgroundColor: '#ffffff',
            color: '#1f1f1f',
            marginBottom: '20px',
            width: '100%',
            maxWidth: '600px',
          }}
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
            <Form.Item label="Contact Options" name="contact" rules={[{ required: false }]}>
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
            <Button icon={<UploadOutlined />} disabled={isUploading}>
              Select File
            </Button>
          </Upload>
          <Button
            type="primary"
            onClick={handleUpload}
            disabled={!file || isUploading}
            style={{ marginTop: '20px' }}
          >
            Upload
          </Button>
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default ManageAssets;
