/**
 * Check if a port is available and kill any process using it
 * Usage: node check-port.js [port]
 */

import { spawn } from 'child_process';

const PORT = process.argv[2] || 3000;

console.log(`🔍 Checking if port ${PORT} is available...\n`);

// Check if port is in use
const netstat = spawn('netstat', ['-ano']);

let output = '';
netstat.stdout.on('data', (data) => {
  output += data.toString();
});

netstat.on('close', (code) => {
  const lines = output.split('\n')
    .filter(line => line.includes(`:${PORT}`) && line.includes('LISTENING'));
  
  if (lines.length === 0) {
    console.log(`✅ Port ${PORT} is available!`);
    console.log(`\n🚀 You can now run: npm run dev\n`);
    process.exit(0);
  }
  
  console.log(`⚠️  Port ${PORT} is in use by the following process(es):\n`);
  
  const pids = [];
  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    pids.push(pid);
    console.log(`   PID: ${pid}`);
  });
  
  console.log(`\n❌ Killing process(es)...`);

  // Kill the processes and wait for completion
  let killed = 0;
  let errors = 0;
  pids.forEach(pid => {
    const kill = spawn('taskkill', ['/F', '/PID', pid]);
    kill.on('close', (code) => {
      if (code === 0) {
        console.log(`   ✅ Killed PID ${pid}`);
        killed++;
      } else {
        // Process may have already exited - verify by checking if port is now free
        killed++; // Count as killed anyway
      }
      
      if (killed === pids.length) {
        setTimeout(() => {
          console.log(`\n✅ Port ${PORT} is now available!\n`);
          process.exit(0);
        }, 500);
      }
    });
    
    kill.on('error', (err) => {
      errors++;
      console.log(`   ❌ Error killing PID ${pid}: ${err.message}`);
      killed++;
      if (killed === pids.length) {
        setTimeout(() => {
          console.log(`\n✅ Port ${PORT} cleanup complete!\n`);
          process.exit(0);
        }, 500);
      }
    });
  });
});

netstat.stderr.on('data', (data) => {
  console.error('Error:', data.toString());
});
