import http from 'http';

const BASE_URL = 'http://localhost:3001/api';

function get(endpoint: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function post(endpoint: string, body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testEndpoint(endpoint: string, description: string) {
  try {
    const data = await get(endpoint);
    console.log(`✅ ${description}: SUCCESS`);
    return { success: true, data };
  } catch (error: any) {
    console.log(`❌ ${description}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Running API Tests...\n');

  // Test 1: Health
  await testEndpoint('/health', 'Health Check');

  // Test 2: Provinces
  await testEndpoint('/provinces', 'List Provinces');
  
  // Test 3: Province History
  await testEndpoint('/history?province=Guayas', 'Province History (Guayas)');

  // Test 4: Single Prediction
  await testEndpoint('/prediction?province=Guayas&week=15', 'Single Prediction (Guayas, Week 15)');

  // Test 5: National Statistics
  await testEndpoint('/statistics/national', 'National Statistics');

  // Test 6: Epidemiological Summary
  await testEndpoint('/summary?week=15', 'Epidemiological Summary');

  // Test 7: Province Statistics
  await testEndpoint('/statistics/province?province=Guayas', 'Province Statistics (Guayas)');

  // Test 8: Batch Prediction
  try {
    const result = await post('/prediction/batch', {
      provinces: ['Guayas', 'Pichincha', 'Azuay'],
      week: 15
    });
    console.log('✅ Batch Prediction: SUCCESS');
  } catch (error: any) {
    console.log(`❌ Batch Prediction: ${error.message}`);
  }

  console.log('\n✅ All tests completed!');
  process.exit(0);
}

runTests();
