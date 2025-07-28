// HTML Structure (in your index.html file):
/*
(This remains the same as before)
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
const timeSpentFrozenSpan = document.getElementById('timeSpentFrozen');

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

// Unified function for both mouse down and touch start
function recordFreezeStart(event) {
    // Prevent the default browser action (like text selection on touch, or drag on desktop)
    event.preventDefault();

    // Only start if stopwatch is running and not already tracking a press
    if (!isRunning || freezePressStartTime !== 0) return;

    freezePressStartTime = Date.now(); // Mark the start of the hold
    freezeButton.style.backgroundColor = 'red';
    console.log('Freeze button pressed...');
}

// Unified function for both mouse up and touch end/cancel
function recordFreezeEnd() {
    // Only process if stopwatch is running and a press was started
    if (!isRunning || freezePressStartTime === 0) return;

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

    const timeForPercent = (totalTrialTime * percentFrozen) / 100;

    // Display Report
    totalTrialTimeSpan.textContent = formatTime(totalTrialTime);
    numberOfFreezesSpan.textContent = freezeCount;
    percentFrozenSpan.textContent = `${percentFrozen.toFixed(2)}%`;
    timeSpentFrozenSpan.textContent = formatTime(timeForPercent);
    reportBox.style.display = 'block';
}

// --- Event Listeners ---
startButton.addEventListener('click', startStopwatch);

// --- Mouse Events (for Desktop/Laptop with a mouse) ---
freezeButton.addEventListener('mousedown', recordFreezeStart);
freezeButton.addEventListener('mouseup', recordFreezeEnd);
// This 'mouseleave' handles cases where the mouse is dragged off the button while held
freezeButton.addEventListener('mouseleave', recordFreezeEnd);

// --- Touch Events (for Mobile Phones/Tablets) ---
// touchstart: when a finger first touches the screen
freezeButton.addEventListener('touchstart', recordFreezeStart);
// touchend: when a finger is lifted from the screen
freezeButton.addEventListener('touchend', recordFreezeEnd);
// touchcancel: when a touch is interrupted (e.g., too many fingers, incoming call)
freezeButton.addEventListener('touchcancel', recordFreezeEnd);

stopButton.addEventListener('click', stopStopwatch);
