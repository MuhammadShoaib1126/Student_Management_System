// Studentsfrontend.js
const API_BASE_URL = 'http://localhost:3000/api';

// Global variables
let allStudents = [];
let filteredStudents = [];
let allClasses = [];
let currentPage = 1;
const studentsPerPage = 10;
let currentSortField = 'student_id';
let currentSortOrder = 'asc';
let editingStudentId = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    await loadClasses();
    setupEventListeners();
    await loadAllStudents();
}

// Load all classes from database
async function loadClasses() {
    try {
        const response = await fetch(`${API_BASE_URL}/classes`);
        const data = await response.json();
        
        if (data.success) {
            allClasses = data.classes;
            populateClassDropdowns();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error loading classes:', error);
        showError('Failed to load classes: ' + error.message);
    }
}

// Populate class dropdowns in filters and modal
function populateClassDropdowns() {
    const classFilter = document.getElementById('classFilter');
    const studentClass = document.getElementById('studentClass');
    const editStudentClass = document.getElementById('editStudentClass');
    
    // Clear existing options except the first one
    while (classFilter.options.length > 1) classFilter.remove(1);
    while (studentClass.options.length > 1) studentClass.remove(1);
    if (editStudentClass) while (editStudentClass.options.length > 1) editStudentClass.remove(1);
    
    // Add class options
    allClasses.forEach(classItem => {
        const filterOption = new Option(
            `${classItem.class_name} (Grade ${classItem.class_number})`, 
            classItem.class_number
        );
        const modalOption = new Option(
            `${classItem.class_name} (Grade ${classItem.class_number})`, 
            classItem.class_number
        );
        const editOption = new Option(
            `${classItem.class_name} (Grade ${classItem.class_number})`, 
            classItem.class_number
        );
        
        classFilter.add(filterOption);
        studentClass.add(modalOption);
        if (editStudentClass) editStudentClass.add(editOption);
    });
}

// Load all students
async function loadAllStudents() {
    try {
        const response = await fetch(`${API_BASE_URL}/students`);
        const data = await response.json();
        
        if (data.success) {
            allStudents = data.students;
            filteredStudents = [...allStudents];
            updateStats();
            displayStudents();
            setupPagination();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showError('Failed to load students: ' + error.message);
    }
}

// Load students by class
async function loadStudentsByClass(classNumber) {
    try {
        const response = await fetch(`${API_BASE_URL}/students/class/${classNumber}`);
        const data = await response.json();
        
        if (data.success) {
            allStudents = data.students;
            filteredStudents = [...allStudents];
            updateStats();
            displayStudents();
            setupPagination();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error loading students by class:', error);
        showError('Failed to load students: ' + error.message);
    }
}

// Update statistics cards
function updateStats() {
    const totalStudents = document.getElementById('totalStudents');
    const maleStudents = document.getElementById('maleStudents');
    const femaleStudents = document.getElementById('femaleStudents');
    const avgAge = document.getElementById('avgAge');
    
    totalStudents.textContent = filteredStudents.length;
    
    const maleCount = filteredStudents.filter(student => student.gender === 'Male').length;
    const femaleCount = filteredStudents.filter(student => student.gender === 'Female').length;
    
    maleStudents.textContent = maleCount;
    femaleStudents.textContent = femaleCount;
    
    const totalAge = filteredStudents.reduce((sum, student) => sum + (student.age || 0), 0);
    const averageAge = filteredStudents.length > 0 ? (totalAge / filteredStudents.length).toFixed(1) : '0';
    avgAge.textContent = averageAge;
}

// Display students in table
function displayStudents() {
    const tbody = document.getElementById('studentsTableBody');
    
    if (filteredStudents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 40px; color: var(--text); opacity: 0.7;">
                    No students found matching your criteria
                </td>
            </tr>
        `;
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * studentsPerPage;
    const endIndex = startIndex + studentsPerPage;
    const studentsToShow = filteredStudents.slice(startIndex, endIndex);
    
    tbody.innerHTML = studentsToShow.map(student => `
        <tr>
            <td>${student.student_id}</td>
            <td>${student.roll_number}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="student-avatar">
                        ${getInitials(student.name)}
                    </div>
                    <div>
                        <div style="font-weight: 600;">${student.name}</div>
                        <div style="font-size: 0.8rem; opacity: 0.7;">ID: ${student.student_id}</div>
                    </div>
                </div>
            </td>
            <td>${student.fname || 'N/A'}</td>
            <td>
                <span class="age-badge ${getAgeBadgeClass(student.age)}">
                    ${student.age || 'N/A'}
                </span>
            </td>
            <td>${getClassName(student.class_number)}</td>
            <td>
                <span class="gender-${student.gender ? student.gender.toLowerCase() : 'other'}">
                    ${student.gender || 'N/A'}
                </span>
            </td>
            <td>${student.phone || 'N/A'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-small btn-warning" onclick="editStudent(${student.student_id})">
                        ✏️ Edit
                    </button>
                    <button class="btn-small btn-danger" onclick="deleteStudent(${student.student_id})">
                        🗑️ Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
    
    updatePaginationInfo();
}

// Get class name from class number
function getClassName(classNumber) {
    const classItem = allClasses.find(c => c.class_number === classNumber);
    return classItem ? classItem.class_name : `Class ${classNumber}`;
}

// Get initials for avatar
function getInitials(name) {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().substring(0, 2);
}

// Get age badge class
function getAgeBadgeClass(age) {
    if (!age) return 'age-young';
    if (age <= 12) return 'age-young';
    if (age <= 18) return 'age-teen';
    return 'age-adult';
}

// Apply filters
function applyFilters() {
    const classFilter = document.getElementById('classFilter').value;
    const genderFilter = document.getElementById('genderFilter').value;
    const ageFilter = document.getElementById('ageFilter').value;
    const searchInput = document.getElementById('searchInput').value.toLowerCase();
    const sortBy = document.getElementById('sortBy').value;
    
    filteredStudents = allStudents.filter(student => {
        // Class filter
        if (classFilter && student.class_number != classFilter) {
            return false;
        }
        
        // Gender filter
        if (genderFilter && student.gender !== genderFilter) {
            return false;
        }
        
        // Age filter
        if (ageFilter && student.age) {
            const age = student.age;
            switch (ageFilter) {
                case '5-9': if (age < 5 || age > 9) return false; break;
                case '10-12': if (age < 10 || age > 12) return false; break;
                case '13-15': if (age < 13 || age > 15) return false; break;
                case '16-18': if (age < 16 || age > 18) return false; break;
                case '19+': if (age < 19) return false; break;
            }
        }
        
        // Search filter
        if (searchInput) {
            const searchTerm = searchInput.toLowerCase();
            const matchesName = student.name.toLowerCase().includes(searchTerm);
            const matchesRoll = student.roll_number.toLowerCase().includes(searchTerm);
            const matchesFather = student.fname?.toLowerCase().includes(searchTerm);
            
            if (!matchesName && !matchesRoll && !matchesFather) {
                return false;
            }
        }
        
        return true;
    });
    
    // Apply sorting
    sortStudents(sortBy);
    
    currentPage = 1;
    updateStats();
    displayStudents();
    setupPagination();
}

// Sort students
function sortStudents(sortBy) {
    filteredStudents.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
            case 'name':
                aValue = a.name?.toLowerCase() || '';
                bValue = b.name?.toLowerCase() || '';
                return aValue.localeCompare(bValue);
                
            case 'name_desc':
                aValue = a.name?.toLowerCase() || '';
                bValue = b.name?.toLowerCase() || '';
                return bValue.localeCompare(aValue);
                
            case 'roll':
                aValue = a.roll_number?.toLowerCase() || '';
                bValue = b.roll_number?.toLowerCase() || '';
                return aValue.localeCompare(bValue);
                
            case 'age':
                return (a.age || 0) - (b.age || 0);
                
            case 'age_desc':
                return (b.age || 0) - (a.age || 0);
                
            case 'class':
                return (a.class_number || 0) - (b.class_number || 0);
                
            default:
                return a.student_id - b.student_id;
        }
    });
}

// Reset all filters
function resetFilters() {
    document.getElementById('classFilter').value = '';
    document.getElementById('genderFilter').value = '';
    document.getElementById('ageFilter').value = '';
    document.getElementById('searchInput').value = '';
    document.getElementById('sortBy').value = 'name';
    
    filteredStudents = [...allStudents];
    currentPage = 1;
    updateStats();
    displayStudents();
    setupPagination();
}

// Search students
function searchStudents() {
    applyFilters();
}

// ==================== VALIDATION FUNCTIONS ====================

function validateRollNumber(value, isEdit = false) {
    if (!value) return 'Roll number is required';
    if (value.length > 20) return 'Roll number must be 20 characters or less';
    if (!/^[A-Za-z0-9]+$/.test(value)) return 'Roll number can only contain letters and numbers, no special characters';
    return null;
}

function validateName(value, fieldName) {
    if (!value) return `${fieldName} is required`;
    if (value.length > 100) return `${fieldName} must be 100 characters or less`;
    if (!/^[A-Za-z\s]+$/.test(value)) return `${fieldName} can only contain letters and spaces`;
    if (/^\d+$/.test(value)) return `${fieldName} cannot be only numbers`;
    return null;
}

function validateAge(value) {
    if (value === null || value === '') return null;
    if (!/^\d+$/.test(value.toString())) return 'Age must be a positive number';
    if (value < 5 || value > 25) return 'Age must be between 5 and 25';
    return null;
}

function validateClass(value) {
    if (!value) return 'Class is required';
    return null;
}

function validateGender(value) {
    if (value && !['Male', 'Female', 'Other'].includes(value)) {
        return 'Gender must be Male, Female, or Other';
    }
    return null;
}

function validateAddress(value) {
    if (value && value.trim() !== '') {
        if (/^\d+$/.test(value.replace(/\s/g, ''))) {
            return 'Address cannot be only numbers';
        }
        if (value.length > 500) return 'Address must be 500 characters or less';
    }
    return null;
}

function validatePhone(value) {
    if (value && value.trim() !== '') {
        const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
        if (!/^\d+$/.test(cleanPhone)) return 'Phone number can only contain digits, spaces, hyphens, and parentheses';
        if (cleanPhone.length > 15) return 'Phone number must be 15 digits or less';
        if (cleanPhone.length < 7) return 'Phone number must be at least 7 digits';
    }
    return null;
}

function validateStudentForm(formData, isEdit = false) {
    const errors = [];
    
    const rollError = validateRollNumber(formData.rollNumber, isEdit);
    if (rollError) errors.push({ field: 'rollNumber', error: rollError });
    
    const nameError = validateName(formData.name, 'Student name');
    if (nameError) errors.push({ field: 'name', error: nameError });
    
    const fnameError = validateName(formData.fname, 'Father name');
    if (fnameError) errors.push({ field: 'fname', error: fnameError });
    
    const ageError = validateAge(formData.age);
    if (ageError) errors.push({ field: 'age', error: ageError });
    
    const classError = validateClass(formData.classNumber);
    if (classError) errors.push({ field: 'classNumber', error: classError });
    
    const genderError = validateGender(formData.gender);
    if (genderError) errors.push({ field: 'gender', error: genderError });
    
    const addressError = validateAddress(formData.address);
    if (addressError) errors.push({ field: 'address', error: addressError });
    
    const phoneError = validatePhone(formData.phone);
    if (phoneError) errors.push({ field: 'phone', error: phoneError });
    
    return errors;
}

// ==================== ADD STUDENT ====================

async function addStudent() {
    const form = document.getElementById('addStudentForm');
    const formData = {
        rollNumber: document.getElementById('rollNumber').value.trim(),
        name: document.getElementById('studentName').value.trim(),
        fname: document.getElementById('fatherName').value.trim(),
        age: document.getElementById('studentAge').value ? parseInt(document.getElementById('studentAge').value) : null,
        classNumber: document.getElementById('studentClass').value ? parseInt(document.getElementById('studentClass').value) : null,
        gender: document.getElementById('studentGender').value || null,
        address: document.getElementById('studentAddress').value.trim() || null,
        phone: document.getElementById('studentPhone').value.trim() || null
    };
    
    // Validate all fields
    const errors = validateStudentForm(formData);
    
    if (errors.length > 0) {
        const errorMessages = errors.map(e => `• ${e.field}: ${e.error}`).join('\n');
        showError('Please fix the following errors:\n' + errorMessages);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/students`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Student added successfully!');
            closeModal('addStudentModal');
            form.reset();
            await loadAllStudents();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error adding student:', error);
        showError('Failed to add student: ' + error.message);
    }
}

// ==================== EDIT STUDENT ====================

async function editStudent(studentId) {
    const student = allStudents.find(s => s.student_id === studentId);
    if (!student) {
        showError('Student not found');
        return;
    }
    
    editingStudentId = studentId;
    
    // Populate edit form with student data
    document.getElementById('editRollNumber').value = student.roll_number;
    document.getElementById('editStudentName').value = student.name;
    document.getElementById('editFatherName').value = student.fname || '';
    document.getElementById('editStudentAge').value = student.age || '';
    document.getElementById('editStudentClass').value = student.class_number || '';
    document.getElementById('editStudentGender').value = student.gender || '';
    document.getElementById('editStudentAddress').value = student.address || '';
    document.getElementById('editStudentPhone').value = student.phone || '';
    
    showModal('editStudentModal');
}

async function updateStudent() {
    const formData = {
        rollNumber: document.getElementById('editRollNumber').value.trim(),
        name: document.getElementById('editStudentName').value.trim(),
        fname: document.getElementById('editFatherName').value.trim(),
        age: document.getElementById('editStudentAge').value ? parseInt(document.getElementById('editStudentAge').value) : null,
        classNumber: document.getElementById('editStudentClass').value ? parseInt(document.getElementById('editStudentClass').value) : null,
        gender: document.getElementById('editStudentGender').value || null,
        address: document.getElementById('editStudentAddress').value.trim() || null,
        phone: document.getElementById('editStudentPhone').value.trim() || null
    };
    
    // Validate all fields
    const errors = validateStudentForm(formData, true);
    
    if (errors.length > 0) {
        const errorMessages = errors.map(e => `• ${e.field}: ${e.error}`).join('\n');
        showError('Please fix the following errors:\n' + errorMessages);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/students/${editingStudentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Student updated successfully!');
            closeModal('editStudentModal');
            editingStudentId = null;
            await loadAllStudents();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error updating student:', error);
        showError('Failed to update student: ' + error.message);
    }
}

// Delete student
async function deleteStudent(studentId) {
    const student = allStudents.find(s => s.student_id === studentId);
    
    if (!student) {
        showError('Student not found');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete ${student.name} (Roll: ${student.roll_number})? This action cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/students/${studentId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Student deleted successfully!');
            await loadAllStudents();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showError('Failed to delete student: ' + error.message);
    }
}

// Pagination functions
function setupPagination() {
    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;
    
    prevPageBtn.onclick = goToPreviousPage;
    nextPageBtn.onclick = goToNextPage;
}

function goToPreviousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayStudents();
        setupPagination();
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayStudents();
        setupPagination();
    }
}

function updatePaginationInfo() {
    const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
    const pageInfo = document.getElementById('pageInfo');
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

// Modal functions
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Utility functions
function showError(message) {
    alert('❌ Error: ' + message);
}

function showSuccess(message) {
    alert('✅ Success: ' + message);
}

// Setup event listeners
function setupEventListeners() {
    // Add student button
    document.getElementById('addStudentBtn').addEventListener('click', () => {
        showModal('addStudentModal');
    });
    
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        await loadAllStudents();
        showSuccess('Data refreshed successfully!');
    });
    
    // Filter buttons
    document.getElementById('applyFiltersBtn').addEventListener('click', applyFilters);
    document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);
    
    // Search input
    document.getElementById('searchInput').addEventListener('input', searchStudents);
    document.getElementById('searchBtn').addEventListener('click', searchStudents);
    
    // Sort select
    document.getElementById('sortBy').addEventListener('change', applyFilters);
    
    // Filter selects
    document.getElementById('classFilter').addEventListener('change', applyFilters);
    document.getElementById('genderFilter').addEventListener('change', applyFilters);
    document.getElementById('ageFilter').addEventListener('change', applyFilters);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Enter key in search
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchStudents();
        }
    });
}

// Table sorting functionality (optional enhancement)
document.addEventListener('DOMContentLoaded', function() {
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const sortField = this.getAttribute('data-sort');
            sortTable(sortField);
        });
    });
});

function sortTable(field) {
    // Remove existing sort classes
    document.querySelectorAll('.sortable').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
    });
    
    // Toggle sort order or set new one
    if (currentSortField === field) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortField = field;
        currentSortOrder = 'asc';
    }
    
    // Add sort class to current header
    const currentHeader = document.querySelector(`[data-sort="${field}"]`);
    currentHeader.classList.add(currentSortOrder === 'asc' ? 'sort-asc' : 'sort-desc');
    
    // Apply sorting
    applyFilters();
}