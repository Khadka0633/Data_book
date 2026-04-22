// ─── HealthMonitor.jsx — fix the filter in loadLogs ───
// FIND:
filter: `userId = "${userId}"`
// REPLACE WITH:
filter: `userId = '${userId}'`


// ─── TodoList.jsx — fix the filter in loadTodos ───
// FIND:
filter: `userId = "${userId}"`
// REPLACE WITH:
filter: `userId = '${userId}'`


// ─── TransferModal.jsx — no filter needed, no change ───


// ─── The Rule ───
// PocketBase filter syntax uses SINGLE QUOTES around string values:
// ✅ Correct:  filter: `userId = '${userId}'`
// ❌ Wrong:    filter: `userId = "${userId}"`
// The double quotes inside the template literal break the filter parser