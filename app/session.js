const API_BASE_URL_LOCAL = "http://localhost:5000/api";
const API_BASE_URL = "https://attend-forum-server-dev-1-0.onrender.com/api";

let currentSessions = [];
let selectedSessionID = null;
let userLat = null;
let userLong = null;

// Session data fetch with improved error handling and loading states
async function fetchSessions() {
    const token = localStorage.getItem("token");
    const userID = localStorage.getItem("userID");

    // Authentication check
    if (!token || !userID) {
        showToast("error", "Authentication error", "Please log in again");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 2000);
        return;
    }

    // Update user information
    const userName = localStorage.getItem("userName") || "Student";
    document.getElementById("userName").textContent = userName;
    document.getElementById("userNameInfo").textContent = userName;
    document.getElementById("userEmail").textContent = localStorage.getItem("userEmail") || "No email";

    // Show loading state
    toggleElement("loadingIndicator", true);
    toggleElement("errorContainer", false);
    toggleElement("emptyState", false);
    toggleElement("sessionsGrid", false);

    try {
        const response = await fetch(`${API_BASE_URL}/student/sessions/${userID}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();

        // Hide loading state
        toggleElement("loadingIndicator", false);

        if (response.ok) {
            currentSessions = result.data || [];

            // Update session count badge
            document.getElementById("sessionCount").textContent = currentSessions.length;

            // Show sessions
            showTab('active');
            showToast("success", "Success", "Sessions loaded successfully");
        } else {
            // Show error state with message from API
            showError("Failed to load sessions: " + result.message);
        }
    } catch (error) {
        console.error("Error fetching sessions:", error);
        toggleElement("loadingIndicator", false);
        showError("Network error. Please check your connection and try again.");
    }
}

// Show sessions based on tab (active or completed)
function showTab(tab) {
    // Update active tab styling
    const activeTab = document.getElementById("activeTab");
    const completedTab = document.getElementById("completedTab");

    activeTab.classList.toggle("active", tab === 'active');
    completedTab.classList.toggle("active", tab === 'completed');

    // Filter sessions based on status
    const filteredSessions = currentSessions.filter(session =>
        session.sessionStatus === (tab === 'active' ? 'active' : 'completed')
    );

    const sessionsGrid = document.getElementById("sessionsGrid");
    sessionsGrid.innerHTML = "";

    // Show empty state if no sessions
    if (filteredSessions.length === 0) {
        document.getElementById("emptyStateMessage").textContent =
            `There are no ${tab} sessions available right now.`;
        toggleElement("emptyState", true);
        toggleElement("sessionsGrid", false);
        return;
    }

    // Show sessions grid
    toggleElement("emptyState", false);
    toggleElement("sessionsGrid", true);

    // Sort sessions - absent sessions first for active tab
    if (tab === 'active') {
        filteredSessions.sort((a, b) => {
            const userIDA = localStorage.getItem("userID");
            const studentA = a.students.find(student => student.studentID === userIDA);
            const studentB = b.students.find(student => student.studentID === userIDA);

            const isAbsentA = studentA && studentA.attendanceStatus === "Absent";
            const isAbsentB = studentB && studentB.attendanceStatus === "Absent";

            // If A is absent and B is not, A comes first
            if (isAbsentA && !isAbsentB) return -1;
            // If B is absent and A is not, B comes first
            if (!isAbsentA && isAbsentB) return 1;

            // If both have the same attendance status, sort by start time (newer first)
            return new Date(b.sessionValidFrom) - new Date(a.sessionValidFrom);
        });
    }

    // Render each session card
    filteredSessions.forEach(session => {
        const card = createSessionCard(session, tab);
        sessionsGrid.appendChild(card);
    });
}
function navigateToSession(sessionID) {
    window.location.href = `sessionDetails.html?sessionID=${sessionID}`;
}
// Create a session card element
function createSessionCard(session, tabType) {
    const card = document.createElement("div");
    card.className = "card bg-white p-6 rounded-xl shadow-md relative";

    // Define badge color based on status
    const badgeColor = session.sessionStatus === 'active'
        ? 'bg-indigo-500 text-white'
        : 'bg-gray-500 text-white';

    // Card badge (active/completed)
    card.innerHTML = `
        <div class="card-badge ${badgeColor}">
            ${session.sessionStatus.charAt(0).toUpperCase() + session.sessionStatus.slice(1)}
        </div>
    `;

    // Session date formatting
    const startDate = new Date(session.sessionValidFrom);
    const endDate = new Date(session.sessionValidTo);
    const dateOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    // Calculate if session is happening now
    const now = new Date();
    const isHappeningNow = now >= startDate && now <= endDate;

    // Attendance status
    const studentInfo = session.students.find(student => student.studentID === localStorage.getItem("userID"));
    const attendanceStatus = studentInfo ? studentInfo.attendanceStatus : "Unknown";
    const isPresent = attendanceStatus === "Present";

    // Attendance badge styling
    const attendanceBadgeClass = isPresent
        ? 'bg-green-100 text-green-800'
        : 'bg-red-100 text-red-700';

    // Main card content
    card.innerHTML += `
        <div class="mt-2">
            <h3 class="text-xl font-bold text-gray-800 mb-2">${session.sessionTitle}</h3>
            <p class="text-gray-600 mb-4">${session.sessionDescription}</p>
            
            <div class="space-y-3 mb-4">
                <div class="flex items-center text-sm">
                    <i class="fas fa-calendar-alt text-indigo-500 w-5"></i>
                    <span class="ml-2">
                        ${startDate.toLocaleDateString('en-US', dateOptions)} - 
                        ${endDate.toLocaleDateString('en-US', dateOptions)}
                    </span>
                </div>
                
                <div class="flex items-center text-sm">
                    <i class="fas fa-info-circle text-indigo-500 w-5"></i>
                    <span class="ml-2">Session ID: ${session.sessionID}</span>
                </div>

                  <div class="flex items-center text-sm">
                    <i class="fas fa-clipboard-check text-indigo-500 w-5"></i>
                    <span class="ml-2">See Details: 
                        <span class="status-badge ${attendanceBadgeClass}">
                            ${attendanceStatus}
                        </span>
                    </span>
                </div>
            </div>
            <button 
  class="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold rounded-full shadow-lg hover:from-red-500 hover:to-pink-500 transition-all duration-300 ease-in-out transform hover:scale-105" 
  onclick="navigateToSession('${session.sessionID}')"
>
  See Details
  <svg class="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
  </svg>
</button>

        </div>
    `;

    // Add attendance button if applicable
    if (session.sessionStatus === "active" && attendanceStatus === "Absent") {
        const attendanceButton = document.createElement("button");
        attendanceButton.className = "w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center justify-center";
        attendanceButton.innerHTML = `
            <i class="fas fa-check-circle mr-2"></i>
            Mark Attendance
        `;
        attendanceButton.onclick = () => promptAttendance(session.sessionID, session.sessionTitle);
        card.appendChild(attendanceButton);
    }

    return card;
}

// Show attendance prompt
function promptAttendance(sessionID, sessionTitle = "this session") {
    selectedSessionID = sessionID;

    // Update popup message
    document.getElementById("popupMessage").textContent =
        `Are you sure you want to mark your attendance for ${sessionTitle}?`;

    // Reset location elements
    document.getElementById("locationProgress").style.width = "0%";
    document.getElementById("locationStatus").textContent = "Waiting for permission...";
    document.getElementById("confirmAttendanceBtn").disabled = true;

    // Show popup
    const popup = document.getElementById("popup");
    popup.classList.remove("hidden");
    popup.classList.add("flex");

    // Request location
    requestLocation();
}

// Request user's location
function requestLocation() {
    if (navigator.geolocation) {
        document.getElementById("locationProgress").style.width = "30%";
        document.getElementById("locationStatus").textContent = "Requesting location...";

        navigator.geolocation.getCurrentPosition(
            // Success callback
            (position) => {
                userLat = position.coords.latitude;
                userLong = position.coords.longitude;

                document.getElementById("locationProgress").style.width = "100%";
                document.getElementById("locationStatus").textContent = "Location acquired!";
                document.getElementById("confirmAttendanceBtn").disabled = false;

                console.log("Location acquired:", userLat, userLong);
            },
            // Error callback
            (error) => {
                console.error("Geolocation error:", error);
                document.getElementById("locationProgress").style.width = "100%";
                document.getElementById("locationStatus").textContent = "Location error: " + getLocationErrorMessage(error);
                document.getElementById("locationStatus").classList.add("text-red-500");
            }
        );
    } else {
        document.getElementById("locationStatus").textContent = "Geolocation is not supported by this browser.";
        document.getElementById("locationStatus").classList.add("text-red-500");
    }
}

// Get user-friendly geolocation error message
function getLocationErrorMessage(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            return "Location permission denied.";
        case error.POSITION_UNAVAILABLE:
            return "Location information unavailable.";
        case error.TIMEOUT:
            return "Location request timed out.";
        default:
            return "Unknown location error.";
    }
}

// Submit attendance
async function confirmAttendance() {
    if (!selectedSessionID || userLat === null || userLong === null) {
        showToast("error", "Error", "Location data is required");
        return;
    }

    const token = localStorage.getItem("token");
    const userID = localStorage.getItem("userID");

    if (!token || !userID) {
        showToast("error", "Authentication error", "Please log in again");
        closePopup();
        setTimeout(() => {
            window.location.href = "index.html";
        }, 2000);
        return;
    }

    // Show loading state in button
    const confirmBtn = document.getElementById("confirmAttendanceBtn");
    const originalBtnText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...';
    confirmBtn.disabled = true;

    // Prepare request payload
    const payload = {
        sessionID: selectedSessionID,
        studentID: userID,
        latitude: parseFloat(userLat),
        longitude: parseFloat(userLong),
        timestamp: new Date().toISOString()
    };

    try {
        const attendUrl = `${API_BASE_URL}/student/sessions/mark-attendance`;
        console.log("Sending attendance data:", JSON.stringify(payload, null, 2));
        console.log(token);
        console.log(attendUrl);

        const response = await fetch(attendUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        // Check if response can be parsed as JSON
        let result;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            result = await response.json();
        } else {
            const text = await response.text();
            result = { success: response.ok, message: text };
        }

        if (response.ok) {
            showToast("success", "Success", "Attendance marked successfully!");
            closePopup();
            // Refresh sessions data
            fetchSessions();
        } else {
            const errorMsg = result.message || `Failed to mark attendance (${response.status})`;
            console.error("Attendance error:", errorMsg);
            showToast("error", "Error", errorMsg);
            confirmBtn.innerHTML = originalBtnText;
            confirmBtn.disabled = false;
        }
    } catch (error) {
        console.error("Error marking attendance:", error);
        showToast("error", "Network Error", error.message || "Please check your connection");
        confirmBtn.innerHTML = originalBtnText;
        confirmBtn.disabled = false;
    }
}

// Close attendance popup
function closePopup() {
    const popup = document.getElementById("popup");
    popup.classList.add("hidden");
    popup.classList.remove("flex");

    // Reset selected session and location
    selectedSessionID = null;
    userLat = null;
    userLong = null;
}

// Show error message
function showError(message) {
    const errorContainer = document.getElementById("errorContainer");
    const errorMessage = document.getElementById("errorMessage");

    errorMessage.textContent = message;
    toggleElement("errorContainer", true);
    toggleElement("sessionsGrid", false);
    toggleElement("emptyState", false);
}

// Show toast notification
function showToast(type, title, message) {
    const toast = document.getElementById("toast");
    const toastContent = document.getElementById("toastContent");

    // Set icon and colors based on type
    let icon = '';
    let bgColor = '';

    switch (type) {
        case "success":
            icon = '<i class="fas fa-check-circle text-2xl text-green-500 mr-3"></i>';
            bgColor = 'border-l-4 border-green-500';
            break;
        case "error":
            icon = '<i class="fas fa-exclamation-circle text-2xl text-red-500 mr-3"></i>';
            bgColor = 'border-l-4 border-red-500';
            break;
        case "warning":
            icon = '<i class="fas fa-exclamation-triangle text-2xl text-yellow-500 mr-3"></i>';
            bgColor = 'border-l-4 border-yellow-500';
            break;
        case "info":
            icon = '<i class="fas fa-info-circle text-2xl text-blue-500 mr-3"></i>';
            bgColor = 'border-l-4 border-blue-500';
            break;
    }

    // Set toast content
    toastContent.innerHTML = `
        ${icon}
        <div>
            <h4 class="font-bold">${title}</h4>
            <p class="text-gray-600">${message}</p>
        </div>
    `;

    // Add styling
    toast.className = `fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 max-w-md ${bgColor}`;

    // Show toast
    toast.classList.add("toast-enter");
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";

    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove("toast-enter");
        toast.classList.add("toast-exit");

        setTimeout(() => {
            toast.style.transform = "translateY(20px)";
            toast.style.opacity = "0";
        }, 300);
    }, 3000);
}

// Toggle element visibility
function toggleElement(elementId, show) {
    const element = document.getElementById(elementId);
    if (show) {
        element.classList.remove("hidden");
    } else {
        element.classList.add("hidden");
    }
}

// Logout function
function logout() {
    // Show confirmation toast
    showToast("info", "Logging out", "Please wait...");

    // Clear local storage
    setTimeout(() => {
        localStorage.clear();
        window.location.href = "index.html";
    }, 1000);
}

// Initialize on page load
window.onload = fetchSessions;