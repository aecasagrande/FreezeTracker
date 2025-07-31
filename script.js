// JavaScript (in a script.js file linked to your HTML):

let startTime; // Absolute timestamp when trial started
let timerInterval;
let isRunning = false;
let totalTrialTimeMs = 0; // Total time of the trial
let freezePressStartTime = 0; // Absolute timestamp when the freeze button was pressed down

// freezeEvents now stores { id, startMs, endMs, durationMs } for each freeze
let freezeEvents = [];
let nextFreezeId = 0; // Simple counter for unique IDs for each freeze event

// Global array to store data for all completed trials
let allTrialsData = []; // This will hold objects for each completed trial

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

// New Export Button
const exportDataButton = document.getElementById('exportDataButton');


// --- Helper Functions ---

// Formats milliseconds into HH:MM:SS.ms (e.g., 00:01:23.456)
function formatTime(ms) {
    if (ms < 0) ms = 0; // Ensure no negative times
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

// NEW HELPER: Formats a Date object into HH:MM:SS.ms of the day
function formatTimeOfDay(dateObj) {
    if (!dateObj) return '';
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getSeconds()).padStart(2, '0');
    const milliseconds = String(dateObj.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

// Helper to format Date objects to ISO string for CSV (kept for filename if needed, or if user changes mind)
function formatTimestampISO(dateObj) {
    return dateObj ? dateObj.toISOString() : '';
}


// --- Local Storage Functions ---

function loadTrialsData() {
    const storedData = localStorage.getItem('allTrialsData');
    if (storedData) {
        try {
            allTrialsData = JSON.parse(storedData);
            console.log('Loaded data from localStorage:', allTrialsData);
        } catch (e) {
            console.error('Error parsing stored data:', e);
            allTrialsData = []; // Reset if parsing fails
        }
    } else {
        allTrialsData = [];
    }
}

function saveTrialsData() {
    localStorage.setItem('allTrialsData', JSON.stringify(allTrialsData));
    console.log('Data saved to localStorage.');
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

    startTime = Date.now(); // Record absolute start time
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

    console.log(`Trial started for Patient ID: ${patientId}, Trial #: ${trialNumber} at ${formatTimeOfDay(new Date(startTime))}`);
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
    console.log('Freeze button pressed. Start time (absolute):', formatTimeOfDay(new Date(freezePressStartTime)));

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

    const trialEndTime = Date.now(); // Record absolute end time
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
    updateReportAndFreezeList(); // This also populates report fields and calls renderFreezeList()

    // Package trial data for storage
    const patientId = patientIdInput.value.trim();
    const trialNumber = parseInt(trialNumberInput.value);
    let currentTotalFreezeDuration = 0;
    freezeEvents.forEach(event => { currentTotalFreezeDuration += event.durationMs; });
    const currentFreezeCount = freezeEvents.length;
    const percentFrozen = (totalTrialTimeMs > 0) ? (currentTotalFreezeDuration / totalTrialTimeMs) * 100 : 0;
    const { cumulativeGrade, frequencyGrade } = classifyFoG(totalTrialTimeMs, currentTotalFreezeDuration, currentFreezeCount, freezeEvents);


    // Create a deep copy of freezeEvents to store it, so future edits don't affect past records
    const freezesForStorage = JSON.parse(JSON.stringify(freezeEvents));

    const trialData = {
        patientId: patientId,
        trialNumber: trialNumber,
        trialStartTimestamp: startTime, // Absolute timestamp (milliseconds since epoch)
        trialEndTimestamp: trialEndTime,   // Absolute timestamp (milliseconds since epoch)
        totalTrialDurationMs: totalTrialTimeMs,
        numberOfFreezes: currentFreezeCount,
        totalTimeFrozenMs: currentTotalFreezeDuration,
        percentTrialFrozen: percentFrozen,
        cumulativeFoGGrade: cumulativeGrade,
        frequencyFoGGrade: frequencyGrade,
        freezeEvents: freezesForStorage // Array of individual freeze objects
    };
    allTrialsData.push(trialData);
    saveTrialsData(); // Save to local storage after each trial

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
    console.log('Freeze Events (full data):', freezeEvents); 
    console.log('Stored Trial Data:', trialData);


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

        // Update the report and list. Crucially, also save to local storage.
        updateReportAndFreezeList();
        saveTrialsData(); 
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
    
    // Update the report and list. Crucially, also save to local storage.
    updateReportAndFreezeList();
    saveTrialsData();
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


// --- CSV Export Function ---

function exportDataToCsv() {
    if (allTrialsData.length === 0) {
        alert('No trial data available to export.');
        return;
    }

    // Updated headers to reflect new time formatting and added absolute timestamps for Freeze Start/End
    const headers = [
        'Patient_ID', 'Trial_Number', 
        'Trial_Start_Time_of_Day', 'Trial_End_Time_of_Day', // New: Time of day
        'Trial_Start_Timestamp_ISO', 'Trial_End_Timestamp_ISO', // Original: ISO for full timestamp
        'Trial_Duration_ms', 'Trial_Duration_Formatted',
        'Total_Freezes_Count', 'Total_Freeze_Duration_ms', 'Total_Freeze_Duration_Formatted', 'Percent_Trial_Frozen',
        'FoG_Cumulative_Grade', 'FoG_Frequency_Grade',
        'Freeze_Event_ID', 
        'Freeze_Start_Relative_ms', 'Freeze_End_Relative_ms', 'Freeze_Duration_ms', 'Freeze_Start_Relative_Formatted',
        'Freeze_Start_Time_of_Day', 'Freeze_End_Time_of_Day' // New: Freeze Time of Day
    ];

    let csvRows = [];
    csvRows.push(headers.join(',')); // Add headers to the CSV

    allTrialsData.forEach(trial => {
        const trialStartAbsoluteDate = new Date(trial.trialStartTimestamp);
        const trialEndAbsoluteDate = new Date(trial.trialEndTimestamp);

        // Base row data for the trial (repeated for each freeze event)
        const baseTrialData = [
            `"${trial.patientId}"`, // Enclose in quotes for safety with potential commas/spaces
            trial.trialNumber,
            formatTimeOfDay(trialStartAbsoluteDate), // New time of day column
            formatTimeOfDay(trialEndAbsoluteDate),   // New time of day column
            formatTimestampISO(trialStartAbsoluteDate), // Original ISO timestamp
            formatTimestampISO(trialEndAbsoluteDate),   // Original ISO timestamp
            trial.totalTrialDurationMs,
            formatTime(trial.totalTrialDurationMs),
            trial.numberOfFreezes,
            trial.totalTimeFrozenMs,
            formatTime(trial.totalTimeFrozenMs),
            trial.percentTrialFrozen.toFixed(2),
            `"${trial.cumulativeFoGGrade}"`,
            `"${trial.frequencyFoGGrade}"`
        ];

        if (trial.freezeEvents && trial.freezeEvents.length > 0) {
            trial.freezeEvents.forEach(freeze => {
                // Calculate absolute freeze start/end times for time of day formatting
                const freezeStartAbsoluteDate = new Date(trial.trialStartTimestamp + freeze.startMs);
                const freezeEndAbsoluteDate = new Date(trial.trialStartTimestamp + freeze.endMs);

                const freezeData = [
                    freeze.id,
                    freeze.startMs,
                    freeze.endMs,
                    freeze.durationMs,
                    formatTime(freeze.startMs),
                    formatTimeOfDay(freezeStartAbsoluteDate), // New freeze time of day
                    formatTimeOfDay(freezeEndAbsoluteDate)    // New freeze time of day
                ];
                csvRows.push(baseTrialData.concat(freezeData).join(','));
            });
        } else {
            // If no freezes, still include the trial data with blank freeze specific columns
            const freezeData = ['', '', '', '', '', '', '']; // Blanks for new freeze columns
            csvRows.push(baseTrialData.concat(freezeData).join(','));
        }
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    // Dynamic filename: PatientID_Export_YYYYMMDD_HHMM.csv
    const now = new Date();
    const dateString = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    const timeString = `${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const patientIdForFilename = patientIdInput.value.trim().replace(/\s/g, '_') || 'UnknownPatient'; // Replace spaces with underscores
    link.setAttribute('download', `${patientIdForFilename}_FoG_Data_${dateString}_${timeString}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up the URL object

    console.log('Data exported to CSV.');
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

// New Export Button Listener
exportDataButton.addEventListener('click', exportDataToCsv);

// Ensure trial number input updates correctly if typed
trialNumberInput.addEventListener('change', updateTrialNumberInput);
trialNumberInput.addEventListener('input', updateTrialNumberInput);

// Initial call to ensure trial number is valid on load and load existing data
updateTrialNumberInput();
loadTrialsData(); // Load any previously stored data when the app starts
