// JavaScript (in a script.js file linked to your HTML):

let startTime; // Absolute timestamp when trial started
let timerInterval;
let isRunning = false;
let totalTrialTimeMs = 0; // Total time of the trial
let freezePressStartTime = 0; // Absolute timestamp when the freeze button was pressed down

// freezeEvents now stores { id, startMs, endMs, durationMs } for each freeze
let freezeEvents = [];
let nextFreezeId = 0; // Simple counter for unique IDs for each freeze event

// DOM Elements
const timerDisplay = document.getElementById('timerDisplay');
const startButton = document.getElementById('startButton');
const freezeButton = document.getElementById('freezeButton');
const stopButton = document.getElementById('stopButton');

const reportBox = document.getElementById('reportBox');
const totalTrialTimeSpan = document.getElementById('totalTrialTime');
const numberOfFreezesSpan = document.getElementById('numberOfFreezes');
const percentFrozenSpan = document = document.getElementById('percentFrozen'); // Corrected typo here
const timeSpentFrozenSpan = document.getElementById('timeSpentFrozen');
const freezeListContainer = document.getElementById('freezeListContainer');
const freezeList = document.getElementById('freezeList'); // Container for individual freeze items

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
    freezePressStartTime = 0;
    freezeEvents = []; // Reset freeze events array for the new trial
    nextFreezeId = 0; // Reset ID counter
    
    startButton.disabled = true;
    freezeButton.disabled = false;
    stopButton.disabled = false;
    reportBox.style.display = 'none'; // Hide report initially
    freezeListContainer.style.display = 'none'; // Ensure this is hidden at start

    timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        timerDisplay.textContent = formatTime(elapsedTime);
    }, 10);

    console.log(`Trial started for Patient ID: ${patientId}, Trial #: ${trialNumber}`);
}

// Unified function for both mouse down and touch start
function recordFreezeStart(event) {
    event.preventDefault(); // Prevent default touch behavior like scrolling
    console.log('recordFreezeStart triggered by:', event.type);

    if (!isRunning || freezePressStartTime !== 0) {
        console.log('Freeze start ignored (not running or already started):', { isRunning, freezePressStartTime });
        return;
    }

    freezePressStartTime = Date.now(); // Record absolute start time
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

    const freezeEndTime = Date.now(); // Record absolute end time
    const freezeDuration = freezeEndTime - freezePressStartTime;
    
    // Calculate relative times correctly for storage
    const freezeStartRelative = freezePressStartTime - startTime; 
    const freezeEndRelative = freezeEndTime - startTime;

    freezeEvents.push({
        id: nextFreezeId++,
        startMs: freezeStartRelative,
        endMs: freezeEndRelative,
        durationMs: freezeDuration
    });

    freezePressStartTime = 0;
    freezeButton.style.backgroundColor = '';

    console.log(`Freeze ended. Duration: ${formatTime(freezeDuration)}. Total recorded freezes: ${freezeEvents.length}`);
}

function stopStopwatch() {
    if (!isRunning) return;

    const trialEndTime = Date.now();
    clearInterval(timerInterval);
    isRunning = false;

    // If the freeze button was still being held when STOP was pressed
    if (freezePressStartTime !== 0) {
        const finalFreezeDuration = trialEndTime - freezePressStartTime;
        const freezeStartRelative = freezePressStartTime - startTime;

        freezeEvents.push({
            id: nextFreezeId++,
            startMs: freezeStartRelative,
            endMs: trialEndTime - startTime,
            durationMs: finalFreezeDuration
        });
        freezePressStartTime = 0;
        freezeButton.style.backgroundColor = '';
    }

    if (navigator.vibrate) {
        navigator.vibrate(0); // Stop any lingering vibration
        console.log('Vibration stopped by stopStopwatch if lingering!');
    }

    totalTrialTimeMs = trialEndTime - startTime; // Store total trial time

    // Calculate and Display Report (initial display)
    updateReportAndFreezeList();

    // Enable inputs and hide main action buttons
    patientIdInput.disabled = false;
    trialNumberInput.disabled = false;
    decrementTrialButton.disabled = false;
    incrementTrialButton.disabled = false;
    
    startButton.disabled = false; // Re-enable start button
    freezeButton.disabled = true; // Keep freeze button disabled
    stopButton.disabled = true;   // Keep stop button disabled

    reportBox.style.display = 'block'; // Show report
    freezeListContainer.style.display = 'block'; // CRUCIAL: Ensure this is set to block here!

    console.log(`Stopwatch stopped. Report generated.`);
    // Updated console.log to reflect the new structure
    console.log('Freeze Events (full data):', freezeEvents); 

    // After stopping, automatically increment trial number for next run
    incrementTrial(); 
}

// --- Freeze List Management and Report Update ---

function updateReportAndFreezeList() {
    let currentTotalFreezeDuration = 0;
    freezeEvents.forEach(event => {
        currentTotalFreezeDuration += event.durationMs;
    });

    const currentFreezeCount = freezeEvents.length;
    const percentFrozen = (totalTrialTimeMs > 0) ? (currentTotalFreezeDuration / totalTrialTimeMs) * 100 : 0;

    // Update Report Spans
    reportPatientIdSpan.textContent = patientIdInput.value.trim();
    reportTrialNumberSpan.textContent = parseInt(trialNumberInput.value);
    totalTrialTimeSpan.textContent = formatTime(totalTrialTimeMs);
    numberOfFreezesSpan.textContent = currentFreezeCount;
    percentFrozenSpan.textContent = `${percentFrozen.toFixed(2)}%`;
    timeSpentFrozenSpan.textContent = formatTime(currentTotalFreezeDuration);

    // Classify FoG
    const { cumulativeGrade, frequencyGrade } = classifyFoG(totalTrialTimeMs, currentTotalFreezeDuration, currentFreezeCount, freezeEvents);
    cumulativeFoGGradeSpan.textContent = cumulativeGrade;
    frequencyFoGGradeSpan.textContent = frequencyGrade;

    // Render/Re-render Freeze List
    renderFreezeList();
}

function renderFreezeList() {
    freezeList.innerHTML = ''; // Clear existing list

    if (freezeEvents.length === 0) {
        freezeList.innerHTML = '<p style="font-size: 0.9em; color: #777;">No freeze episodes recorded for this trial.</p>';
        return;
    }

    freezeEvents.forEach((event, index) => {
        const freezeItem = document.createElement('div');
        freezeItem.className = 'freeze-item';
        freezeItem.dataset.id = event.id; // Store unique ID for easy lookup

        // THIS IS THE KEY FIX: Ensure the duration is rendered correctly here.
        freezeItem.innerHTML = `
            <span>Freeze ${index + 1}: <span class="freeze-duration">${formatTime(event.durationMs)}</span></span>
            <div class="freeze-actions">
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            </div>
        `;
        freezeList.appendChild(freezeItem);
    });

    // Add event listeners to the newly created buttons
    addFreezeListEventListeners();
}

function addFreezeListEventListeners() {
    freezeList.querySelectorAll('.edit-btn').forEach(button => {
        button.onclick = (e) => editFreeze(e.target);
    });
    freezeList.querySelectorAll('.delete-btn').forEach(button => {
        button.onclick = (e) => deleteFreeze(e.target);
    });
}

function editFreeze(buttonElement) {
    const freezeItemDiv = buttonElement.closest('.freeze-item');
    const freezeId = parseInt(freezeItemDiv.dataset.id);
    const freeze = freezeEvents.find(f => f.id === freezeId);

    if (!freeze) return;

    const durationSpan = freezeItemDiv.querySelector('.freeze-duration');
    const originalDurationMs = freeze.durationMs;

    // Convert milliseconds to seconds for easier editing
    const durationInSeconds = (originalDurationMs / 1000).toFixed(1); // One decimal place

    durationSpan.innerHTML = `
        <input type="number" step="0.1" min="0" value="${durationInSeconds}" class="edit-input"> s
    `;

    // Change buttons to Save/Cancel
    const actionsDiv = freezeItemDiv.querySelector('.freeze-actions');
    actionsDiv.innerHTML = `
        <button class="save-edit-btn">Save</button>
        <button class="cancel-edit-btn">Cancel</button>
    `;

    actionsDiv.querySelector('.save-edit-btn').onclick = () => {
        const input = freezeItemDiv.querySelector('.edit-input');
        let newDurationSeconds = parseFloat(input.value);

        if (isNaN(newDurationSeconds) || newDurationSeconds < 0) {
            alert('Please enter a valid positive number for duration.');
            // Revert to original state if invalid input
            durationSpan.textContent = formatTime(originalDurationMs); // Restore original formatted duration
            actionsDiv.innerHTML = `
                <button class="edit-btn">Edit</button>
                <button class="delete-btn">Delete</button>
            `;
            addFreezeListEventListeners();
            return;
        }

        const newDurationMs = Math.round(newDurationSeconds * 1000); // Convert back to milliseconds

        // Update the freeze object
        freeze.durationMs = newDurationMs;
        // Re-calculate endMs based on new duration, assuming startMs is fixed
        freeze.endMs = freeze.startMs + newDurationMs; 

        updateReportAndFreezeList(); // Re-render and recalculate
    };

    actionsDiv.querySelector('.cancel-edit-btn').onclick = () => {
        // Restore original content and buttons
        durationSpan.textContent = formatTime(originalDurationMs); // Use the original duration
        actionsDiv.innerHTML = `
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
        `;
        addFreezeListEventListeners(); // Re-attach listeners for the restored buttons
    };
    
    // Auto-focus on the input field
    const editInput = freezeItemDiv.querySelector('.edit-input');
    if (editInput) {
        editInput.focus();
        editInput.select(); // Select existing text for easy overwrite
    }
}


function deleteFreeze(buttonElement) {
    const freezeItemDiv = buttonElement.closest('.freeze-item');
    const freezeId = parseInt(freezeItemDiv.dataset.id);

    // Find the index of the freeze to be deleted
    const indexToDelete = freezeEvents.findIndex(f => f.id === freezeId);

    if (indexToDelete === -1) return; // Freeze not found

    // Prompt for confirmation before deleting
    if (!confirm(`Are you sure you want to delete Freeze ${indexToDelete + 1}? This action cannot be undone.`)) {
        return; // User cancelled
    }

    // Remove the freeze from the array
    freezeEvents.splice(indexToDelete, 1);
    
    updateReportAndFreezeList(); // Re-render and recalculate
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
        } else {
            // This case handles a single freeze between 1 and 2 seconds.
            // Based on previous logic, it falls into "Grade 2" as it's not "brief (<1s)"
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
freezeButton.addEventListener('mouseleave', recordFreezeEnd); // In case mouse leaves button while held

// Touch Events
freezeButton.addEventListener('touchstart', recordFreezeStart);
freezeButton.addEventListener('touchend', recordFreezeEnd);
freezeButton.addEventListener('touchcancel', recordFreezeEnd); // In case touch is cancelled/interrupted

stopButton.addEventListener('click', stopStopwatch);

// Trial Number Button Listeners
decrementTrialButton.addEventListener('click', decrementTrial);
incrementTrialButton.addEventListener('click', incrementTrial);

// Ensure trial number input updates correctly if typed
trialNumberInput.addEventListener('change', updateTrialNumberInput);
trialNumberInput.addEventListener('input', updateTrialNumberInput);

// Initial call to ensure trial number is valid on load
updateTrialNumberInput();
