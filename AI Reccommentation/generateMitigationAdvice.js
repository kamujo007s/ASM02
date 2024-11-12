const { MongoClient } = require("mongodb");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../logger");

require("dotenv").config();

// ตั้งค่า API Key
const apiKey = process.env.API_KEY;
const mongoUri = process.env.MONGODB_URL;
const client = new MongoClient(mongoUri);

// ตั้งค่า Google Generative AI
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-002" });

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

// ฟังก์ชันดึงข้อมูลจาก MongoDB
async function getCVEData(cveId) {
  try {
    await client.connect();
    const database = client.db("ASM-01"); // เปลี่ยนเป็นชื่อ database ของคุณ
    const collection = database.collection("cves");

    // ค้นหาข้อมูล CVE ตาม ID
    const cveData = await collection.findOne({ id: cveId });
    return cveData;
  } catch (error) {
    logger.error("Error fetching CVE data:", error);
  } finally {
    await client.close();
  }
}

// ฟังก์ชันสร้างคำแนะนำการแก้ไขช่องโหว่โดย AI
async function generateMitigationAdvice(cveId) {
    let advice;
    try {
      await client.connect();
      const database = client.db("ASM-01"); // เปลี่ยนเป็นชื่อ database ของคุณ
      const collection = database.collection("vulnerabilities");
  
      // ตรวจสอบว่ามีคำแนะนำอยู่แล้วหรือไม่
      const existingVulnerability = await collection.findOne({ cveId: cveId });
      if (existingVulnerability && existingVulnerability.mitigationAdvice) {
        logger.info("Existing mitigation advice found in database");
        return existingVulnerability.mitigationAdvice;
      }
  
      // เรียกใช้ getCVEData โดยส่ง database เข้าไป
      const cveData = await getCVEData(cveId, database);
      if (!cveData) {
        logger.info("No data found for this CVE.");
        return;
      }
  
      // ส่วนที่เหลือของโค้ดไม่มีการเปลี่ยนแปลง
      const { descriptions, configurations, metrics, references } = cveData;
      const description = descriptions[0]?.value || "No description available";
      const affectedSystems =
        configurations
          ?.map((config) =>
            config.nodes.flatMap((node) =>
              node.cpeMatch.map((cpe) => cpe.criteria)
            )
          )
          .join(", ") || "Not specified";
  
      // ตรวจสอบ CVSS เวอร์ชันต่างๆ
      let severity = "Unknown";
      let score = "Unknown";
      if (metrics?.cvssMetricV31?.[0]) {
        severity = metrics.cvssMetricV31[0].baseSeverity || severity;
        score = metrics.cvssMetricV31[0].cvssData?.baseScore || score;
      } else if (metrics?.cvssMetricV30?.[0]) {
        severity = metrics.cvssMetricV30[0].baseSeverity || severity;
        score = metrics.cvssMetricV30[0].cvssData?.baseScore || score;
      } else if (metrics?.cvssMetricV2?.[0]) {
        severity = metrics.cvssMetricV2[0].baseSeverity || severity;
        score = metrics.cvssMetricV2[0].cvssData?.baseScore || score;
      }
  
      const refs = references.map((ref) => ref.url).join("\n");
  
      const prompt = `
        ช่องโหว่ CVE: ${cveId}
        คำอธิบาย: ${description}
        ระบบที่ได้รับผลกระทบ: ${affectedSystems}
        ระดับความรุนแรง: ${severity} (Score: ${score})
  
        กรุณาให้คำแนะนำการปิดหรือแก้ไขช่องโหว่นี้ โดยคำแนะนำควร:
        - สั้น กระชับ แต่ให้ข้อมูลครบถ้วน
        - ชัดเจนและเข้าใจง่าย
        - ตรงประเด็น
  
        โปรดระบุขั้นตอนการแก้ไข รวมถึงวิธีการป้องกันหากเป็นไปได้ โดยใช้รูปแบบ bullet points:
          1. ขั้นตอนที่ 1
          2. ขั้นตอนที่ 2
          3. ขั้นตอนที่ 3
      `;
  
      const chatSession = model.startChat({
        generationConfig,
        history: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });
  
      const result = await chatSession.sendMessage(prompt);
      advice = result.response.text();
  
      // เก็บคำแนะนำลงใน collection vulnerabilities
      await collection.updateOne(
        { cveId: cveId },
        { $set: { mitigationAdvice: advice } },
        { upsert: true }
      );
  
      logger.info("AI Response:", advice);
      logger.info("Mitigation advice generated and saved to database");
    } catch (error) {
      logger.error("Error generating or saving mitigation advice:", error);
    } finally {
      await client.close();
    }
    return advice;
  }

module.exports = {
  generateMitigationAdvice,
};