// logger.js
const { createLogger, format, transports } = require('winston');
const logger = createLogger({
  level: 'info', // ตั้งระดับเป็น 'info' เพื่อบันทึกทั้ง info และ error
  format: format.combine(
    format.colorize(), // เพิ่มสีสันให้กับ Log ในคอนโซล
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level}]: ${message}${stack ? `\nStack Trace:\n${stack}` : ''}`;
    })
  ),
  transports: [
    new transports.Console(), // แสดง Log ในคอนโซล
    new transports.File({ filename: 'error.log', level: 'error' }), // บันทึก Error ลงไฟล์
    new transports.File({ filename: 'application.log', level: 'info' }), // บันทึก Log ทั้งหมดลงไฟล์

  ],
});

module.exports = logger;
