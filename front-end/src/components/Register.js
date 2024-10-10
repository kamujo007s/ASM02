import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Register = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await axios.post('http://192.168.123.180:3012/api/auth/register', values);
      message.success('Registration successful');
      navigate('/login');
    } catch (error) {
      message.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container" style={{ maxWidth: '400px', margin: 'auto', padding: '50px' }}>
      <Title level={2} style={{ textAlign: 'center' }}>Register</Title>
      <Form
        name="register"
        initialValues={{ remember: true }}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="username"
          rules={[{ required: true, message: 'Please input your Username!' }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Username" />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ required: true, message: 'Please input your Password!' }]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Register
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Register;