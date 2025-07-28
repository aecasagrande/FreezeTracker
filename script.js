// JavaScript (in a script.js file linked to your HTML):

let startTime;
let timerInterval;
let isRunning = false;
let freezeCount = 0;
let totalFreezeDuration = 0; // in milliseconds
let freezePressStartTime = 0; // To track when the freeze button was pressed down
// freezeEvents now stores only { durationMs } for each freeze
let freezeEvents = [];

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
// const freezeTimelineContainer = document.getElementById('freezeTimeline'); // REMOVED: No longer needed

// Patient ID and Trial Number Elements
const patientIdInput = document.getElementById('patientId');
const trialNumberInput = document.getElementById('trialNumber');
const decrementTrialButton = document.getElementById('decrementTrial');
const incrementTrialButton = document.getElementById('incrementTrial');

// Report spans for Patient ID, Trial #, and FoG grades
const reportPatientIdSpan = document.getElementById('reportPatientId');
const reportTrialNumberSpan = document.getElementById('reportTrialNumber');
const cumulativeFoGGradeSpan = document.getElementById('cumulativeFoGGrade');
const frequencyFoGGradeSpan = document.getElementById('frequencyFoGGrade');


// --- Helper Functions ---

function formatTime(ms) {
    if (ms < 0) ms = 0; // Ensure no negative times
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

// --- Trial Number Functions ---

function updateTrialNumberInput() {
    trialNumberInput.value = parseInt(trialNumberInput.value);
    if (trialNumberInput.value < 1) {
        trialNumberInput.value = 1;
    }
}

function incrementTrial() {
    trialNumberInput.value = parseInt(trialNumberInput.value) + 1;
    updateTrialNumberInput();
}

function decrementTrial() {
    trialNumberInput.value = parseInt(trialNumberInput.value) - 1;
    updateTrialNumberInput();
}


// --- Core Stopwatch Functions ---

function startStopwatch() {
    if (isRunning) return;

    // Validate Patient ID and Trial Number
    const patientId = patientIdInput.value.trim();
    const trialNumber = parseInt(trialNumberInput.value);

    if (!patientId) {
        alert("Please enter a Patient ID to start the trial.");
        return;
    }
    if (isNaN(trialNumber) || trialNumber < 1) {
        alert("Please enter a valid Trial # (a number greater than 0).");
        return;
    }

    // Disable inputs during trial
    patientIdInput.disabled = true;
    trialNumberInput.disabled = true;
    decrementTrialButton.disabled = true;
    incrementTrialButton.disabled = true;

    startTime = Date.now();
    isRunning = true;
    freezeCount = 0;
    totalFreezeDuration = 0;
    freezePressStartTime = 0;
    freezeEvents = []; // Reset freeze events array for the new trial
    // freezeTimelineContainer.innerHTML = ''; // REMOVED: No longer needed

    startButton.disabled = true;
    freezeButton.disabled = false;
    stopButton.disabled = false;
    reportBox.style.display = 'none'; // Hide report initially

    timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        timerDisplay.textContent = formatTime(elapsedTime);
    }, 10);

    console.log(`Trial started for Patient ID: ${patientId}, Trial #: ${trialNumber}`);
}

// Unified function for both mouse down and touch start
function recordFreezeStart(event) {
    event.preventDefault();
    console.log('recordFreezeStart triggered by:', event.type);

    if (!isRunning || freezePressStartTime !== 0) {
        console.log('Freeze start ignored (not running or already started):', { isRunning, freezePressStartTime });
        return;
    }

    freezePressStartTime = Date.now();
    freezeButton.style.backgroundColor = 'red';
    console.log('Freeze button pressed. Start time:', freezePressStartTime);

    // Vibrate the device with a single pulse (200ms)
    if (navigator.vibrate) {
        navigator.vibrate(200); // Vibrate for 200 milliseconds
        console.log('Single vibration pulse!');
    } else {
        console.log('Vibration not supported or API unavailable.');
    }
}

// Unified function for both mouse up and touch end/cancel
function recordFreezeEnd(event) {
    console.log('recordFreezeEnd triggered by:', event.type);

    if (!isRunning || freezePressStartTime === 0) {
        console.log('Freeze end ignored (not running or no start time):', { isRunning, freezePressStartTime });
        return;
    }

    const freezeDuration = Date.now() - freezePressStartTime;

    totalFreezeDuration += freezeDuration;
    freezeCount++;

    // Store only the durationMs for classification
    freezeEvents.push({
        durationMs: freezeDuration
    });

    freezePressStartTime = 0;
    freezeButton.style.backgroundColor = '';

    console.log(`Freeze ended. Duration: ${formatTime(freezeDuration)}. Total freezes: ${freezeCount}`);

    // No need to stop vibration here, as it was a single pulse
}

function stopStopwatch() {
    if (!isRunning) return;

    const trialEndTime = Date.now(); // Get absolute trial end time
    clearInterval(timerInterval);
    isRunning = false;

    // Enable inputs after trial stops
    patientIdInput.disabled = false;
    trialNumberInput.disabled = false;
    decrementTrialButton.disabled = false;
    incrementTrialButton.disabled = false;
    
    startButton.disabled = false;
    freezeButton.disabled = true;
    stopButton.disabled = true;

    // If the freeze button was still being held when STOP was pressed
    if (freezePressStartTime !== 0) {
        const finalFreezeDuration = trialEndTime - freezePressStartTime;

        totalFreezeDuration += finalFreezeDuration;
        freezeCount++;

        // Store this final freeze event
        freezeEvents.push({
            durationMs: finalFreezeDuration
        });

        freezePressStartTime = 0;
        freezeButton.style.backgroundColor = '';
    }

    // Ensure any lingering vibration stops if stopwatch is stopped while freeze button might have been held
    if (navigator.vibrate) {
        navigator.vibrate(0);
        console.log('Vibration stopped by stopStopwatch if lingering!');
    }

    const totalTrialTime = trialEndTime - startTime;
    const percentFrozen = (totalFreezeDuration / totalTrialTime) * 100 || 0;

    // Display Report
    reportPatientIdSpan.textContent = patientIdInput.value.trim();
    reportTrialNumberSpan.textContent = parseInt(trialNumberInput.value);
    totalTrialTimeSpan.textContent = formatTime(totalTrialTime);
    numberOfFreezesSpan.textContent = freezeCount;
    percentFrozenSpan.textContent = `${percentFrozen.toFixed(2)}%`;
    timeSpentFrozenSpan.textContent = formatTime(totalFreezeDuration);

    // NEW: Classify FoG
    const { cumulativeGrade, frequencyGrade } = classifyFoG(totalTrialTime, totalFreezeDuration, freezeCount, freezeEvents);
    cumulativeFoGGradeSpan.textContent = cumulativeGrade;
    frequencyFoGGradeSpan.textContent = frequencyGrade;


    reportBox.style.display = 'block';

    console.log(`Stopwatch stopped. Report generated.`);
    console.log('Freeze Events (durations only):', freezeEvents);

    // After stopping, automatically increment trial number for next run
    incrementTrial();
}


// --- FoG Classification Function ---
function classifyFoG(totalTrialTimeMs, totalFreezeDurationMs, freezeCount, freezeEvents) {
    let cumulativeGradeText = '';
    let frequencyGradeText = '';

    const percentFrozen = (totalTrialTimeMs > 0) ? (totalFreezeDurationMs / totalTrialTimeMs) * 100 : 0;
    const MAX_FOG_DURATION_FOR_GRADE_4 = 60000; // 60 seconds in milliseconds
    const BRIEF_FOG_THRESHOLD_MS = 1000; // <1sec
    const LONG_FOG_THRESHOLD_MS = 2000; // >2seconds


    // --- Cumulative Duration of FoG Classification ---
    if (totalFreezeDurationMs > MAX_FOG_DURATION_FOR_GRADE_4) {
        cumulativeGradeText = '4 = Unable/assistance required';
    } else if (percentFrozen > 50) {
        cumulativeGradeText = '3 = Severe (>50% trial frozen)';
    } else if (percentFrozen > 10) {
        cumulativeGradeText = '2 = Moderate (>10% trial frozen)';
    } else if (totalFreezeDurationMs > 0) { // If there was any freezing, but less than 10%
        cumulativeGradeText = '1 = Mild (<10% trial frozen)';
    } else {
        cumulativeGradeText = '0 = No Freezing';
    }

    // --- Frequency of FoG Classification ---
    if (totalFreezeDurationMs > MAX_FOG_DURATION_FOR_GRADE_4) {
        frequencyGradeText = '4 = Unable/assistance required';
    } else if (freezeCount === 0) {
        frequencyGradeText = '0 = No freezing';
    } else if (freezeCount === 1) {
        if (freezeEvents[0].durationMs < BRIEF_FOG_THRESHOLD_MS) {
            frequencyGradeText = '1 = 1 brief FoG episode (lasting <1sec)';
        } else if (freezeEvents[0].durationMs > LONG_FOG_THRESHOLD_MS) {
            frequencyGradeText = '2 = Multiple brief FoG episodes (>1 episodes) OR 1 long-lasting episode (lasting >2seconds)';
        } else { // Single episode, duration between 1 and 2 seconds inclusive (not brief, not long)
            // This is an ambiguous case in the rules. Since it's not <1s, it's not "brief" for Grade 1.
            // Since it's not >2s, it's not "long-lasting" for Grade 2.
            // I'll default to Grade 1 as it's the mildest non-zero. Alternatively, it could be seen as an unclassified case.
            // Sticking to strict definitions, it doesn't fit Grade 2 (1 long-lasting >2s).
            // So, it's a single episode that's not brief (<1s) and not long (>2s).
            // To ensure it's categorized, it can be put in Grade 2 (which covers "OR 1 long-lasting")
            // This interpretation is the most robust way to categorize all cases as defined.
            frequencyGradeText = '2 = Multiple brief FoG episodes (>1 episodes) OR 1 long-lasting episode (lasting >2seconds)';
        }
    } else { // Multiple freeze episodes (freezeCount > 1)
        let hasLongEpisode = freezeEvents.some(event => event.durationMs > LONG_FOG_THRESHOLD_MS); // Check if *any* episode is long
        if (hasLongEpisode) {
            frequencyGradeText = '3 = Many long FoG episodes (>1 episodes)';
        } else {
            // All multiple episodes are brief (i.e., none > 2000ms)
            frequencyGradeText = '2 = Multiple brief FoG episodes (>1 episodes) OR 1 long-lasting episode (lasting >2seconds)';
        }
    }

    return {
        cumulativeGrade: cumulativeGradeText,
        frequencyGrade: frequencyGradeText
    };
}


// --- Event Listeners ---
startButton.addEventListener('click', startStopwatch);

// Mouse Events
freezeButton.addEventListener('mousedown', recordFreezeStart);
freezeButton.addEventListener('mouseup', recordFreezeEnd);
freezeButton.addEventListener('mouseleave', recordFreezeEnd);

// Touch Events
freezeButton.addEventListener('touchstart', recordFreezeStart);
freezeButton.addEventListener('touchend', recordFreezeEnd);
freezeButton.addEventListener('touchcancel', recordFreezeEnd);

stopButton.addEventListener('click', stopStopwatch);

// Trial Number Button Listeners
decrementTrialButton.addEventListener('click', decrementTrial);
incrementTrialButton.addEventListener('click', incrementTrial);

// Ensure trial number input updates correctly if typed
trialNumberInput.addEventListener('change', updateTrialNumberInput);
trialNumberInput.addEventListener('input', updateTrialNumberInput);

// Initial call to ensure trial number is valid on load
updateTrialNumberInput();
