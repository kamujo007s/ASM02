//Register.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Typography, message } from 'antd';

const { Title } = Typography;

const Register = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [csrfToken, setCsrfToken] = useState('');

  // ดึง CSRF Token ตอนที่ component mount
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await axios.get('http://localhost:3012/api/csrf-token', {
          withCredentials: true, // เพื่อให้ได้ cookie จาก server
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
    console.log('Submitting registration with values:', values); // Log the values being submitted
    try {
      await axios.post(
        'http://localhost:3012/api/auth/register',
        values,
        {
          headers: {
            'X-CSRF-Token': csrfToken,  // ส่ง CSRF Token ไปพร้อมกับ request
          },
          withCredentials: true, // ส่ง cookie ไปด้วยเพื่อทำงานกับ CSRF protection
        }
      );
      message.success('Registration successful!');
      navigate('/login');
    } catch (error) {
      if (error.response && error.response.data && error.response.data.errors) {
        error.response.data.errors.forEach(err => {
          message.error(err.msg);
        });
      } else {
        message.error('Registration failed');
      }
      console.error('Registration error:', error.response ? error.response.data : error.message); // Log detailed error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container" style={{ maxWidth: '400px', margin: 'auto', padding: '50px' }}>
      <Title level={2} style={{ textAlign: 'center' , color:'black' }}>Register</Title>
      <Form name="register" onFinish={handleSubmit}>
        <Form.Item name="username" rules={[{ required: true, message: 'Please input your Username!' }]}>
          <Input placeholder="Username" />
        </Form.Item>
        <Form.Item name="password" rules={[{ required: true, message: 'Please input your Password!' }]}>
          <Input.Password placeholder="Password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Register
          </Button>
        </Form.Item>
      </Form>
      <p style={{ textAlign: 'center' }}>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
};

export default Register;