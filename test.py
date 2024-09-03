import requests
from bs4 import BeautifulSoup

cveid = input('CVE-ID : ')
# URL ของหน้าเว็บที่ต้องการดึงข้อมูล
url = f"https://www.cvedetails.com/cve/{cveid}/?q={cveid}"

# Headers ที่จำลองการร้องขอจากเบราว์เซอร์
headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Referer": "https://www.google.com/",
}

# ส่งคำขอเพื่อดึงหน้าเว็บพร้อมกับ headers
response = requests.get(url, headers=headers)

# ตรวจสอบว่าคำขอสำเร็จหรือไม่
if response.status_code == 200:
    # สร้าง BeautifulSoup object
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # ค้นหา div ที่มีข้อความ "Exploit prediction scoring system (EPSS) score"
    epss_section = soup.find('h2', text='Exploit prediction scoring system (EPSS) score for ')
    
    if epss_section:
        # ค้นหาองค์ประกอบ span ที่มีคลาส 'epssbox'
        epss_score_span = epss_section.find_next('span', class_='epssbox')
        
        if epss_score_span:
            # ดึงค่า EPSS score
            epss_score = epss_score_span.text.strip()
            print(f"EPSS score for {cveid}: {epss_score}")
        else:
            print("EPSS score span not found.")
    else:
        print("EPSS section not found.")
else:
    print(f"Failed to retrieve the page. Status code: {response.status_code}")