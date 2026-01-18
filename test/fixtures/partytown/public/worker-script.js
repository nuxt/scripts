// This script runs in a web worker via Partytown
// It calls a forwarded function to communicate back to main thread
console.log('Partytown script executing in worker')
window.testFn('partytown-executed')
