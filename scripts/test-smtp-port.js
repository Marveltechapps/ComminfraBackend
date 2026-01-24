/**
 * Test SMTP Port Connectivity
 * Checks if port 587 is reachable and not blocked by firewall
 * Usage: node scripts/test-smtp-port.js
 */

const net = require('net');

console.log('🔍 Testing SMTP Port 587 Connectivity...\n');

function testPort(host, port, timeout = 10000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let connected = false;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      connected = true;
      socket.destroy();
      resolve({ success: true, message: 'Port is open and reachable' });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, message: 'Connection timeout - port may be blocked by firewall' });
    });

    socket.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        resolve({ success: false, message: 'Connection refused - service not running on that port' });
      } else if (err.code === 'EHOSTUNREACH') {
        resolve({ success: false, message: 'Host unreachable - network routing issue' });
      } else if (err.code === 'ETIMEDOUT') {
        resolve({ success: false, message: 'Connection timeout - firewall may be blocking' });
      } else {
        resolve({ success: false, message: `Error: ${err.message}` });
      }
    });

    socket.connect(port, host);
  });
}

async function runTests() {
  console.log('📡 Testing connection to smtp.gmail.com:587...');
  
  const result = await testPort('smtp.gmail.com', 587, 15000);
  
  if (result.success) {
    console.log('✅ Port 587 is reachable!');
    console.log('   Firewall is not blocking SMTP connections');
    console.log('\n💡 The timeout might be due to:');
    console.log('   1. Nodemailer timeout too short');
    console.log('   2. Network latency');
    console.log('   3. Gmail rate limiting');
  } else {
    console.log('❌ Port 587 connection failed!');
    console.log(`   ${result.message}`);
    console.log('\n💡 Solutions:');
    console.log('   1. Check Windows Firewall - allow outbound port 587');
    console.log('   2. Check antivirus/security software - may be blocking SMTP');
    console.log('   3. Check corporate network - may block SMTP ports');
    console.log('   4. Try from different network (mobile hotspot) to test');
  }
  
  console.log('\n🔧 Windows Firewall Check:');
  console.log('   Run in PowerShell (as Admin):');
  console.log('   Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*SMTP*" -or $_.DisplayName -like "*Mail*"}');
}

runTests().catch(console.error);
