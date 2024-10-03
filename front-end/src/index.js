// index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';  // ใช้สไตล์ใหม่จาก index.css ที่ปรับปรุงแล้ว
import App from './App';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
    <ToastContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      theme="dark"  // กำหนดธีมมืดสำหรับ ToastContainer
    />
  </React.StrictMode>
);
