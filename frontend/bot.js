// ---------- REAL-TIME SYSTEM BOT ----------
import * as api from './api.js';
import { io } from 'socket.io-client';

const BOT_USERNAME = 'system_bot'; // Must exist in users.json
const BOT_ROLE = 'bot';

const socket = io(); // Connect to your server

// ---------- Real-time Badge Assignment ----------
async function assignBadgeRealtime(badgeName) {
  try {
    const users = await api.getUsers();
    const students = users.filter(u => u.role === 'student');

    for (const student of students) {
      await api.assignBadge(student.username, badgeName);
      console.log(`✅ Assigned "${badgeName}" to ${student.username}`);
      socket.emit('badgeUpdated'); // Notify all clients
    }
  } catch (err) {
    console.error('❌ Badge assignment failed:', err);
  }
}

// ---------- Real-time Attendance ----------
async function markAttendanceRealtime(status = 'present') {
  try {
    const users = await api.getUsers();
    const students = users.filter(u => u.role === 'student');
    const today = new Date().toISOString().split('T')[0];

    const attendanceRecords = students.map(student => ({
      username: student.username,
      date: today,
      status
    }));

    await api.saveAttendance(attendanceRecords);
    console.log(`✅ Attendance marked "${status}" for all students`);
    socket.emit('attendanceUpdated', { date: today, records: attendanceRecords });
  } catch (err) {
    console.error('❌ Attendance update failed:', err);
  }
}

// ---------- Real-time Master Command Execution ----------
async function executeMasterCommandRealtime(commandName) {
  try {
    const commands = await api.getMasterCommands();
    const cmd = commands.find(c => c.name === commandName);
    if (!cmd) return console.log(`⚠️ Command "${commandName}" not found`);

    await api.executeMasterCommand(cmd.id, { actor: BOT_USERNAME });
    console.log(`⚡ Executed command "${commandName}"`);
    socket.emit('master:execute', { id: cmd.id, actor: BOT_USERNAME });
  } catch (err) {
    console.error('❌ Master command execution failed:', err);
  }
}

// ---------- Scheduler / Automation ----------
function botScheduler() {
  // Assign a badge every day at 9 AM
  setInterval(() => assignBadgeRealtime('Star Performer'), 1000 * 60 * 60 * 24);

  // Mark attendance every day at 8 AM
  setInterval(() => markAttendanceRealtime('present'), 1000 * 60 * 60 * 24);

  // Execute master command every hour
  setInterval(() => executeMasterCommandRealtime('dailyUpdate'), 1000 * 60 * 60);
}

// ---------- Listen for Server Events (Optional) ----------
socket.on('requestBotAction', async (data) => {
  if(data.type === 'assignBadge') assignBadgeRealtime(data.badgeName);
  if(data.type === 'attendance') markAttendanceRealtime(data.status);
  if(data.type === 'masterCommand') executeMasterCommandRealtime(data.commandName);
});

// ---------- Run Bot ----------
botScheduler();
console.log('🤖 System bot running...');
