// This script runs in a web worker via Partytown
console.log('Partytown script executing in worker')
// Set a marker that we can check from the main thread
window.__partytownWorkerRan = true
