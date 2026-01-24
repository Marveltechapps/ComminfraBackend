/**
 * Test DNS and Network Connectivity
 * Diagnoses DNS resolution and network issues
 * Usage: node scripts/test-dns-connectivity.js
 */

const dns = require('dns');
const { promisify } = require('util');
const lookup = promisify(dns.lookup);

console.log('🔍 Testing DNS and Network Connectivity...\n');

// Test DNS resolution
async function testDNS() {
  console.log('📡 Testing DNS Resolution:');
  
  try {
    const addresses = await lookup('smtp.gmail.com');
    console.log('✅ DNS Resolution Successful!');
    console.log('   smtp.gmail.com resolves to:', addresses.address);
    if (addresses.family === 6) {
      console.log('   (IPv6 address)');
    }
    return true;
  } catch (error) {
    console.error('❌ DNS Resolution Failed!');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    return false;
  }
}

// Test multiple DNS servers
async function testDNSWithServers() {
  console.log('\n📡 Testing with Different DNS Servers:');
  
  const dnsServers = [
    { name: 'Google DNS (8.8.8.8)', server: '8.8.8.8' },
    { name: 'Cloudflare DNS (1.1.1.1)', server: '1.1.1.1' },
    { name: 'System Default', server: null }
  ];
  
  for (const dnsConfig of dnsServers) {
    try {
      if (dnsConfig.server) {
        dns.setServers([dnsConfig.server]);
      }
      const addresses = await lookup('smtp.gmail.com', { timeout: 5000 });
      console.log(`✅ ${dnsConfig.name}: ${addresses.address}`);
    } catch (error) {
      console.error(`❌ ${dnsConfig.name}: ${error.message}`);
    }
  }
  
  // Reset to system default
  dns.setServers([]);
}

// Test network connectivity
async function testConnectivity() {
  console.log('\n🌐 Testing Network Connectivity:');
  
  const testHosts = [
    'google.com',
    'smtp.gmail.com',
    '8.8.8.8' // Google DNS IP
  ];
  
  for (const host of testHosts) {
    try {
      const addresses = await lookup(host, { timeout: 5000 });
      console.log(`✅ ${host}: Reachable (${addresses.address})`);
    } catch (error) {
      console.error(`❌ ${host}: ${error.message}`);
    }
  }
}

// Main test
async function runTests() {
  const dnsWorks = await testDNS();
  
  if (!dnsWorks) {
    console.log('\n⚠️  DNS resolution failed. Trying alternative DNS servers...');
    await testDNSWithServers();
  }
  
  await testConnectivity();
  
  console.log('\n💡 Solutions:');
  if (!dnsWorks) {
    console.log('1. Check DNS server configuration');
    console.log('2. Try using Google DNS (8.8.8.8) or Cloudflare DNS (1.1.1.1)');
    console.log('3. Check firewall/network settings');
    console.log('4. Verify internet connectivity');
    console.log('5. Check if corporate network blocks external DNS');
  } else {
    console.log('✅ DNS is working. The issue might be:');
    console.log('1. Firewall blocking outbound SMTP connections');
    console.log('2. Network timeout settings too short');
    console.log('3. Proxy/VPN interfering with connections');
  }
}

runTests().catch(console.error);
