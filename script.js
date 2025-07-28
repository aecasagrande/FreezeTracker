// HTML Structure (in your index.html file):
/*
(This remains mostly the same, just an added span in reportBox)
*/

// JavaScript (in a script.js file linked to your HTML):

let startTime;
let timerInterval;
let isRunning = false;
let freezeCount = 0;
let totalFreezeDuration = 0; // in milliseconds
let freezePressStartTime = 0; // To track when the freeze button was pressed down

// DOM Elements
const timerDisplay = document.getElementById('timerDisplay');
const startButton = document.getElementById('startButton');
const freezeButton = document.getElementById('freezeButton');
const stopButton = document.getElementById('stopButton');
const reportBox = document.getElementById('reportBox');
const totalTrialTimeSpan = document.getElementById('totalTrialTime');
const numberOfFreezesSpan = document.getElementById('numberOfFreezes');
const percentFrozenSpan = document.getElementById('percentFrozen');
const timeSpentFrozenSpan = document.getElementById('timeSpentFrozen'); // New span element

// --- Functions ---

function formatTime(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function startStopwatch() {
    if (isRunning) return;

    startTime = Date.now();
    isRunning = true;
    freezeCount = 0;
    totalFreezeDuration = 0;
    freezePressStartTime = 0; // Reset this on start

    startButton.disabled = true;
    freezeButton.disabled = false;
    stopButton.disabled = false;
    reportBox.style.display = 'none'; // Hide report initially

    timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        timerDisplay.textContent = formatTime(elapsedTime);
    }, 10); // Update every 10 milliseconds for smoother display
}

function recordFreezeStart() {
    if (!isRunning || freezePressStartTime !== 0) return; // Prevent multiple start times if held down repeatedly

    freezePressStartTime = Date.now(); // Mark the start of the hold
    freezeButton.style.backgroundColor = 'red';
    console.log('Freeze button pressed...');
}

function recordFreezeEnd() {
    if (!isRunning || freezePressStartTime === 0) return; // Only process if a freeze was started

    const freezeDuration = Date.now() - freezePressStartTime;
    totalFreezeDuration += freezeDuration;
    freezeCount++; // A freeze episode ends when the button is released

    freezePressStartTime = 0; // Reset for the next freeze episode
    freezeButton.style.backgroundColor = ''; // Back to default

    console.log(`Freeze ended. Duration: ${formatTime(freezeDuration)}. Total freezes: ${freezeCount}`);
}

function stopStopwatch() {
    if (!isRunning) return;

    clearInterval(timerInterval);
    isRunning = false;

    startButton.disabled = false;
    freezeButton.disabled = true;
    stopButton.disabled = true;

    // If the freeze button was still being held when STOP was pressed
    if (freezePressStartTime !== 0) {
        totalFreezeDuration += (Date.now() - freezePressStartTime);
        freezeCount++; // Count this as a freeze episode
        freezePressStartTime = 0; // Reset
        freezeButton.style.backgroundColor = ''; // Reset visual cue
    }

    const totalTrialTime = Date.now() - startTime;
    const percentFrozen = (totalFreezeDuration / totalTrialTime) * 100 || 0; // Handle division by zero

    // Calculate the time that corresponds to the percentage
    // If totalTrialTime is 0 (e.g., stopped immediately), this would be 0
    const timeForPercent = (totalTrialTime * percentFrozen) / 100;

    // Display Report
    totalTrialTimeSpan.textContent = formatTime(totalTrialTime);
    numberOfFreezesSpan.textContent = freezeCount;
    percentFrozenSpan.textContent = `${percentFrozen.toFixed(2)}%`;
    timeSpentFrozenSpan.textContent = formatTime(timeForPercent); // Display the new value
    reportBox.style.display = 'block';
}

// --- Event Listeners ---
startButton.addEventListener('click', startStopwatch);
freezeButton.addEventListener('mousedown', recordFreezeStart);
freezeButton.addEventListener('mouseup', recordFreezeEnd);
freezeButton.addEventListener('mouseleave', recordFreezeEnd); // In case mouse is dragged off button
stopButton.addEventListener('click', stopStopwatch);
