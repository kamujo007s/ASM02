import React, { useState, useContext } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ConfigProvider, theme, Form, Input, Button, Card, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { NotificationContext } from '../context/NotificationContext'; // นำเข้า NotificationContext

const ManageAssets = () => {
  const [asset, setAsset] = useState({
    device_name: '',
    application_name: '',
    operating_system: '',
    os_version: '',
  });

  const [file, setFile] = useState(null);
  const { addNotification } = useContext(NotificationContext); // ใช้ useContext เพื่อเข้าถึง addNotification

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

  const handleSubmit = async (values) => {
    const id = toast.loading('Adding asset...', {
      autoClose: false,
      toastId: 'addingAsset',
    });

    try {
      const token = localStorage.getItem('token'); // หรือ sessionStorage.getItem('token')

      await axios.post('http://192.168.123.180:3012/api/assets', values, {
        headers: {
          Authorization: `Bearer ${token}` // เพิ่ม token ใน headers
        }
      });
      toast.update(id, {
        render: 'Asset added successfully!',
        type: 'success',
        isLoading: false,
        autoClose: 5000,
      });
      setAsset({ device_name: '', application_name: '', operating_system: '', os_version: '' });

      // เพิ่มการแจ้งเตือน
      addNotification(`Asset ${values.device_name} added successfully`);

      // Fetch CVE data for the newly added asset only
      try {
        await axios.get(`http://192.168.123.180:3012/cve/update?device_name=${values.device_name}`, {
          headers: {
            Authorization: `Bearer ${token}` // เพิ่ม token ใน headers
          }
        });
        toast.success('CVE data updated successfully for the new asset!', { position: "top-right" });
      } catch (updateError) {
        console.error('Error updating CVE data for the new asset:', updateError);
        toast.error('Failed to update CVE data for the new asset', { position: "top-right" });
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
      toast.error('Please select a file to upload', { position: "top-right" });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setFile(null);

    const id = toast.loading('Uploading file...', { position: "top-right" });

    try {
      const token = localStorage.getItem('token'); // หรือ sessionStorage.getItem('token')

      const response = await axios.post('http://192.168.123.180:3012/api/assets/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}` // เพิ่ม token ใน headers
        }
      });

      console.log('Upload response:', response);

      toast.update(id, {
        render: 'File uploaded successfully',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
        position: "top-right",
      });

      // เพิ่มการแจ้งเตือน
      addNotification('File uploaded successfully');

      // Fetch CVE data for the newly uploaded assets only
      try {
        const updateResponse = await axios.get('http://192.168.123.180:3012/cve/update', {
          headers: {
            Authorization: `Bearer ${token}` // เพิ่ม token ใน headers
          }
        });
        console.log('CVE update response:', updateResponse);
        toast.success('Data updated successfully for the new assets', { position: "top-right" });
      } catch (updateError) {
        console.error('Error updating CVE data for the new assets:', updateError);
        toast.error('Failed to update CVE data for the new assets', { position: "top-right" });
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
          colorPrimary: "#1890ff", // สีหลักตามธีมที่คุณเลือก
          borderRadius: 5, // ปรับ border-radius เป็น 5px
          colorBgContainer: "#ffffff", // พื้นหลังสีขาว
          colorTextBase: "#1f1f1f", // สีข้อความเป็นสีดำ
        },
      }}
    >
      <div className="container mt-5" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <ToastContainer /> {/* สำหรับแสดง Toast */}
        
        {/* Add Asset Manually */}
        <Card title="Add Asset Manually" style={{ backgroundColor: '#ffffff', color: '#1f1f1f', marginBottom: '20px', width: '100%', maxWidth: '600px' }}>
          <Form onFinish={handleSubmit} layout="vertical">
            <Form.Item
              label="Asset Name"
              name="device_name"
              rules={[{ required: true, message: 'Please input the asset name!' }]}
            >
              <Input
                name="device_name"
                value={asset.device_name}
                onChange={handleChange}
              />
            </Form.Item>
            <Form.Item
              label="Application"
              name="application_name"
              rules={[{ required: true, message: 'Please input the application name!' }]}
            >
              <Input
                name="application_name"
                value={asset.application_name}
                onChange={handleChange}
              />
            </Form.Item>
            <Form.Item
              label="Operating System"
              name="operating_system"
              rules={[{ required: true, message: 'Please input the operating system!' }]}
            >
              <Input
                name="operating_system"
                value={asset.operating_system}
                onChange={handleChange}
              />
            </Form.Item>
            <Form.Item
              label="Version"
              name="os_version"
              rules={[{ required: true, message: 'Please input the OS version!' }]}
            >
              <Input
                name="os_version"
                value={asset.os_version}
                onChange={handleChange}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">Add Asset</Button>
            </Form.Item>
          </Form>

          {/* Or Section */}
          <h3 style={{ textAlign: 'center', margin: '20px 0' }}>or Upload file</h3>

          {/* Upload Asset */}
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

export default ManageAssets;