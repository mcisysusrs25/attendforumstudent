// API URLs
const API_BASE_URL_LOCAL = "http://localhost:5000/api";
const API_BASE_URL = "https://attend-forum-server-dev-1-0.onrender.com/api";

// Session details and user variables
let sessionData = null;
let sessionID = null;
let userLat = null;
let userLong = null;

// Initialize on page load
window.onload = function() {
    // Get session ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    sessionID = urlParams.get('sessionID');
    
    if (!sessionID) {
        showError("No session ID provided. Please go back and select a session.");
        return;
    }
    
    // Update user information from localStorage
    const userName = localStorage.getItem("userName") || "Student";
    document.getElementById("userName").textContent = userName;
    
    // Fetch session details
    fetchSessionDetails();
};

// Navigate back to sessions page
function goBack() {
    window.location.href = "sessions.html";
}

// Fetch session details
async function fetchSessionDetails() {
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

    // Show loading state
    toggleElement("loadingIndicator", true);
    toggleElement("errorContainer", false);
    toggleElement("sessionDetailsCard", false);
    toggleElement("attendanceCard", false);

    try {
        const response = await fetch(`${API_BASE_URL}/sessions/gsd/${sessionID}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const result = await response.json();

        // Hide loading state
        toggleElement("loadingIndicator", false);

        if (response.ok && result.data) {
            sessionData = result.data;
            renderSessionDetails();
            showToast("success", "Success", "Session details loaded successfully");
        } else {
            // Show error state with message from API
            showError("Failed to load session details: " + (result.message || "Unknown error"));
        }
    } catch (error) {
        console.error("Error fetching session details:", error);
        toggleElement("loadingIndicator", false);
        showError("Network error. Please check your connection and try again.");
    }
}

// Render session details
function renderSessionDetails() {
    if (!sessionData) return;

    const sessionDetailsCard = document.getElementById("sessionDetailsCard");
    const attendanceCard = document.getElementById("attendanceCard");
    
    // Format dates
    const startDate = new Date(sessionData.sessionValidFrom);
    const endDate = new Date(sessionData.sessionValidTo);
    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    // Calculate session status
    const now = new Date();
    const isActive = sessionData.sessionStatus === "active";
    const isHappeningNow = now >= startDate && now <= endDate;
    const badgeClass = isActive 
        ? (isHappeningNow ? 'bg-green-500' : 'bg-indigo-500') 
        : 'bg-gray-500';
    
    // Get current user's attendance status
    const userID = localStorage.getItem("userID");
    const studentInfo = sessionData.students.find(student => student.studentID === userID);
    const attendanceStatus = studentInfo ? studentInfo.attendanceStatus : "Absent";
    const isPresent = attendanceStatus === "Present";
    
    // Set status badge class
    const statusBadgeClass = isPresent
        ? 'bg-green-100 text-green-800'
        : 'bg-red-100 text-red-700';

    // Populate session details card
    sessionDetailsCard.innerHTML = `
        <div class="flex justify-between items-start mb-6">
            <div>
                <h2 class="text-2xl font-bold text-gray-800">${sessionData.sessionTitle}</h2>
                <p class="text-gray-600">${sessionData.sessionDescription}</p>
            </div>
            <span class="px-4 py-2 rounded-full text-sm font-bold text-white ${badgeClass}">
                ${isHappeningNow ? 'Happening Now' : sessionData.sessionStatus.charAt(0).toUpperCase() + sessionData.sessionStatus.slice(1)}
            </span>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div class="space-y-4">
                <div class="flex items-center">
                    <i class="fas fa-calendar-alt text-indigo-500 w-6 text-xl"></i>
                    <div class="ml-3">
                        <h4 class="font-semibold text-gray-700">Start Time</h4>
                        <p>${startDate.toLocaleDateString('en-US', dateOptions)}</p>
                    </div>
                </div>
                
                <div class="flex items-center">
                    <i class="fas fa-clock text-indigo-500 w-6 text-xl"></i>
                    <div class="ml-3">
                        <h4 class="font-semibold text-gray-700">End Time</h4>
                        <p>${endDate.toLocaleDateString('en-US', dateOptions)}</p>
                    </div>
                </div>
            </div>
            
            <div class="space-y-4">
                <div class="flex items-center">
                    <i class="fas fa-book text-indigo-500 w-6 text-xl"></i>
                    <div class="ml-3">
                        <h4 class="font-semibold text-gray-700">Subject Code</h4>
                        <p>${sessionData.subjectCode || 'N/A'}</p>
                    </div>
                </div>
                
                <div class="flex items-center">
                    <i class="fas fa-id-card text-indigo-500 w-6 text-xl"></i>
                    <div class="ml-3">
                        <h4 class="font-semibold text-gray-700">Session ID</h4>
                        <p>${sessionData.sessionID}</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="border-t border-gray-200 pt-6">
            <div class="flex items-center">
                <i class="fas fa-user-check text-indigo-500 w-6 text-xl"></i>
                <div class="ml-3">
                    <h4 class="font-semibold text-gray-700">Created By</h4>
                    <p>${sessionData.createdBy || 'N/A'}</p>
                </div>
            </div>
        </div>
    `;
    
    // Attendance card
    attendanceCard.innerHTML = `
        <h3 class="text-xl font-bold text-gray-800 mb-4">Attendance Status</h3>
        
        <div class="flex items-center mb-6">
            <div class="mr-4">
                <span class="inline-block rounded-full h-16 w-16 flex items-center justify-center ${isPresent ? 'bg-green-500' : 'bg-red-500'} text-white">
                    <i class="fas ${isPresent ? 'fa-check' : 'fa-times'} text-2xl"></i>
                </span>
            </div>
            <div>
                <h4 class="text-lg font-bold ${isPresent ? 'text-green-700' : 'text-red-700'}">
                    ${attendanceStatus}
                </h4>
                <p class="text-gray-600">
                    ${isPresent 
                        ? 'Your attendance has been confirmed for this session.' 
                        : 'Your attendance has not been marked for this session.'}
                </p>
            </div>
        </div>
    `;
    
    // Add attendance button if needed
    if (isActive && !isPresent) {
        const attendanceButton = document.createElement("button");
        attendanceButton.className = "w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-all duration-300 flex items-center justify-center";
        attendanceButton.innerHTML = `
            <i class="fas fa-check-circle mr-2"></i>
            Mark Attendance
        `;
        attendanceButton.onclick = () => promptAttendance(sessionData.sessionID, sessionData.sessionTitle);
        attendanceCard.appendChild(attendanceButton);
    }
    
    // Show the cards
    toggleElement("sessionDetailsCard", true);
    toggleElement("attendanceCard", true);
}

// Show attendance prompt
function promptAttendance(sessionID, sessionTitle = "this session") {
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
    if (!sessionID || userLat === null || userLong === null) {
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
        sessionID: sessionID,
        studentID: userID,
        latitude: parseFloat(userLat),
        longitude: parseFloat(userLong),
        timestamp: new Date().toISOString()
    };

    try {
        const attendUrl = `${API_BASE_URL}/student/sessions/mark-attendance`;
        
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
            // Refresh session details
            fetchSessionDetails();
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

    // Reset location
    userLat = null;
    userLong = null;
}

// Show error message
function showError(message) {
    const errorContainer = document.getElementById("errorContainer");
    const errorMessage = document.getElementById("errorMessage");

    errorMessage.textContent = message;
    toggleElement("errorContainer", true);
    toggleElement("loadingIndicator", false);
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