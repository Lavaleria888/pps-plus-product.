const API_KEY = "patXDkJ9QaG4BM5gJ.53a7700e08989b2ef4d5d8a8e6b8c3f6eed4f6ccd6f3ea370e5ac4e62e2f9167";
const BASE_ID = "appi0BJDXES8nHKmZ";
const TABLE_NAME = "Package Records";

async function fetchAirtableData() {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${API_KEY}`
        }
    });
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data.records;
}

function renderResults(records) {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv) return;
    resultsDiv.innerHTML = '';
    if (records.length === 0) {
        resultsDiv.textContent = 'No records found.';
        return;
    }
    const ul = document.createElement('ul');
    records.forEach(record => {
        const li = document.createElement('li');
        li.textContent = JSON.stringify(record.fields);
        ul.appendChild(li);
    });
    resultsDiv.appendChild(ul);
}

// เรียกใช้งานเมื่อโหลดหน้าเว็บ
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const records = await fetchAirtableData();
        renderResults(records);
    } catch (error) {
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) resultsDiv.textContent = 'Error: ' + error.message;
    }
});

const resultContainer = document.getElementById('result-container');

async function searchParcel() {
    const trackingNumber = document.getElementById("trackingInput").value.trim();
    if (!trackingNumber) {
        alert("กรุณากรอกเลขพัสดุ");
        return;
    }
    
    // แสดงอนิเมชันกำลังโหลด
    resultContainer.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>กำลังค้นหาข้อมูล...</p>
        </div>`;

    await queryParcel(trackingNumber);
}

async function queryParcel(trackingNumber) {
    // Airtable field names are case-sensitive and often have spaces.
    // Let's use the exact names from your requirement.
    const safeTracking = trackingNumber.replace(/'/g, "''");
    const filterFormula = encodeURIComponent(`{Tracking Number}='${safeTracking}'`);
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?filterByFormula=${filterFormula}`;

    try {
        const resp = await fetch(url, {
            headers: { Authorization: `Bearer ${API_KEY}` }
        });
        if (!resp.ok) {
            throw new Error(`ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (Status: ${resp.status})`);
        }
        const data = await resp.json();

        if (!data.records || data.records.length === 0) {
            displayNotFound(trackingNumber);
        } else {
            // Airtable returns fields in an object.
            const record = data.records[0].fields;
            displayResult(record);
        }
    } catch (err) {
        displayError(err.message, trackingNumber);
    }
}

/**
 * Creates a colored status badge based on the status text.
 * @param {string} status - The status text from Airtable.
 * @returns {string} - HTML string for the badge.
 */
function getStatusBadge(status) {
    let className = 'status-default'; // Default color
    if (!status) return `<span class="badge ${className}">ไม่ระบุ</span>`;

    const lowerCaseStatus = status.toLowerCase();
    
    if (lowerCaseStatus.includes('delivered') || lowerCaseStatus.includes('นำส่งสำเร็จ')) {
        className = 'status-delivered';
    } else if (lowerCaseStatus.includes('in transit') || lowerCaseStatus.includes('ระหว่างขนส่ง')) {
        className = 'status-in-transit';
    } else if (lowerCaseStatus.includes('failed') || lowerCaseStatus.includes('ตกค้าง')) {
        className = 'status-failed';
    }
    
    return `<span class="badge ${className}">${status}</span>`;
}

function displayResult(record) {
    // แสดงข้อมูลทั้งหมดใน console เพื่อตรวจสอบชื่อ field จริง
    console.log('Airtable record fields:', record);
    const trackingNo = record["Tracking Number"] || 'ไม่มีข้อมูล';
    const status = record["Status"] || 'ไม่ระบุ';
    const recipientName = record["Customer Name"] || 'ไม่มีข้อมูล';
    const phoneNumber = record["Phone Number"] || 'ไม่มีข้อมูล';
    // Format date for better readability
    const updatedAt = record["Last Updated"] 
        ? new Date(record["Last Updated"]).toLocaleString('th-TH', { 
            year: 'numeric', month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          })
        : 'ไม่มีข้อมูล';
    const carrier = record["Delivery Company"] || 'ไม่มีข้อมูล';
    const origin = record["Origin"] || 'ไม่มีข้อมูล';
    const destinationAddress = record["Receiver Address"] || 'ไม่มีข้อมูล';
    // รูปภาพจาก Attached Images (ถ้ามี)
    let photoUrl = '';
    if (Array.isArray(record["Attached Images"]) && record["Attached Images"].length > 0) {
        photoUrl = record["Attached Images"][0].url;
    }

    // Conditionally create the photo HTML
    const photoHTML = photoUrl 
        ? `<div class="parcel-photo">
               <img src="${photoUrl}" alt="รูปภาพพัสดุ">
           </div>`
        : '';
        
    resultContainer.innerHTML = `
        <div class="result-details-card">
            <div class="card-header">
                <h3>ผลการค้นหา</h3>
            </div>
            <div class="card-body">
                ${photoHTML}
                <dl class="details-grid">
                    <dt>เลขพัสดุ:</dt>
                    <dd>${trackingNo}</dd>
                    
                    <dt>สถานะ:</dt>
                    <dd>${getStatusBadge(status)}</dd>

                    <dt>ชื่อผู้รับ:</dt>
                    <dd>${recipientName}</dd>
                    
                    <dt>เบอร์โทร:</dt>
                    <dd>${phoneNumber}</dd>

                    <dt>อัปเดตล่าสุด:</dt>
                    <dd>${updatedAt}</dd>

                    <dt>บริษัทขนส่ง:</dt>
                    <dd>${carrier}</dd>

                    <dt>ต้นทาง:</dt>
                    <dd>${origin}</dd>

                    <dt>ที่อยู่ผู้รับ:</dt>
                    <dd>${destinationAddress}</dd>
                </dl>
            </div>
        </div>
    `;
}

function displayNotFound(trackingNumber) {
    resultContainer.innerHTML = `
        <div class="result-details-card not-found">
            <div class="card-body">
                <p><strong>ไม่พบข้อมูลของพัสดุนี้</strong></p>
                <p>กรุณาตรวจสอบหมายเลข <span>${trackingNumber}</span> อีกครั้ง</p>
            </div>
        </div>`;
}

function displayError(message, trackingNumber) {
     resultContainer.innerHTML = `
        <div class="result-details-card error">
             <div class="card-body">
                <p><strong>เกิดข้อผิดพลาด</strong></p>
                <p>${message}</p>
             </div>
        </div>`;
}