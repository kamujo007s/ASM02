import React, { useState } from 'react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ConfigProvider, theme, Form, Input, Button, Card } from 'antd'; // Import Ant Design components

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

  const handleSubmit = async (values) => {
    // แสดง toast ว่ากำลังดำเนินการ
    const id = toast.loading('Adding asset...', {
      autoClose: false,
      toastId: 'addingAsset',
    });

    try {
      await axios.post('http://192.168.123.133:3012/api/assets', values);
      toast.update(id, {
        render: 'Asset added successfully!',
        type: 'success',
        isLoading: false,
        autoClose: 5000,
      });
      setAsset({ device_name: '', application_name: '', operating_system: '', os_version: '' }); // Reset form

      try {
        await axios.get('http://192.168.123.133:3012/cve/update');
        toast.success('CVE data updated successfully!', { position: "top-right" });
      } catch (updateError) {
        console.error('Error updating CVE data:', updateError);
        toast.error('Failed to update CVE data after adding asset', { position: "top-right" });
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

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm, // กำหนดเป็น Dark Theme
        token: {
          colorPrimary: "#fa8c16",  // เปลี่ยนสี primary
          colorInfo: "#fa8c16",
          colorSuccess: "#52c41a",
        },
      }}
    >
      <div className="container mt-5">
        <ToastContainer /> {/* สำหรับแสดง Toast */}
        <Card title="Add Asset Manually" style={{ backgroundColor: '#001529', color: '#fff' }}>
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
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default AddAssetManual;