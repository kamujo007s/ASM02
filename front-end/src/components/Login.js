// Login.js
import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { setAuth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [csrfToken, setCsrfToken] = useState('');

  // ดึง CSRF Token เมื่อ component mount
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await axios.get('http://localhost:3012/api/csrf-token', {
          withCredentials: true,
        });
        setCsrfToken(response.data.csrfToken);
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error);
      }
    };

    fetchCsrfToken();
  }, []);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await axios.post(
        'http://localhost:3012/api/auth/login',
        values,
        {
          headers: {
            'X-CSRF-Token': csrfToken, // ส่ง CSRF Token ใน header
          },
          withCredentials: true, // ส่งคุกกี้ไปพร้อมกับคำขอ
        }
      );
      // หลังจากเข้าสู่ระบบสำเร็จ ตรวจสอบสถานะการยืนยันตัวตนใหม่
      const authResponse = await axios.get('http://localhost:3012/api/auth/me', {
        withCredentials: true,
      });
      if (authResponse.status === 200) {
        setAuth({ isAuthenticated: true, user: authResponse.data.user, loading: false });
        message.success('เข้าสู่ระบบสำเร็จ');
        navigate('/'); // นำผู้ใช้ไปยังหน้า home
      }
    } catch (error) {
      message.error('Login failed');
      console.error('Login error:', error);
      setAuth({ isAuthenticated: false, user: null, loading: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ maxWidth: '400px', margin: 'auto', padding: '50px' }}>
      <Title level={2} style={{ textAlign: 'center' }}>Login</Title>
      <Form name="login" initialValues={{ remember: true }} onFinish={handleSubmit}>
        <Form.Item name="username" rules={[{ required: true, message: 'Please input your Username!' }]}>
          <Input prefix={<UserOutlined />} placeholder="Username" />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true, message: 'Please input your Password!' }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Login
          </Button>
        </Form.Item>
      </Form>
      <p style={{ textAlign: 'center' }}>
        Don't have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
};

export default Login;