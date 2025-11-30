// subjectsfront.js

const API_BASE_URL = 'http://localhost:3000/api';

// Validation function for subject input
function validateSubjectInput(subjectName, maxMarks) {
    // Check if subject name is empty
    if (subjectName === "") {
        return { success: false, message: 'Subject Name cannot be empty' };
    }

    // Subject name validation: allows letters, numbers, and spaces but not only numbers
    const namechecker = /^[a-zA-Z0-9\s]+$/;
    const isvalid = namechecker.test(subjectName);
    const onlyDigits = /^\d+$/;

    if (!isvalid) {
        return { success: false, message: 'Subject name can only contain letters, numbers and spaces' };
    }

    if (onlyDigits.test(subjectName)) {
        return { success: false, message: 'Subject name cannot be only numbers' };
    }

    // Check if max marks is empty
    if (maxMarks === "") {
        return { success: false, message: 'Maximum Marks cannot be empty' };
    }

    // Max marks validation: only positive digits (no negative, no letters, no symbols)
    const num = /^\d+$/;
    const isvalidnum = num.test(maxMarks);

    if (!isvalidnum) {
        return { success: false, message: 'Maximum Marks can only be positive number' };
    }

    // Additional check: max marks should be at least 1
    const marksValue = parseInt(maxMarks);
    if (marksValue < 1) {
        return { success: false, message: 'Maximum Marks must be at least 1' };
    }

    return { success: true, message: 'Valid input' };
}

// Function to get valid subject name with retry logic
async function getValidSubjectName(currentValue = '') {
    while (true) {
        const subjectName = prompt('Enter new subject name:', currentValue);
        
        // User cancelled
        if (subjectName === null) {
            return null;
        }
        
        const subjectNameTrimmed = subjectName.trim();
        
        // Validate subject name
        if (subjectNameTrimmed === "") {
            alert('Subject name cannot be empty!');
            continue; // Ask again
        }
        
        const namechecker = /^[a-zA-Z0-9\s]+$/;
        const onlyDigits = /^\d+$/;
        
        if (!namechecker.test(subjectNameTrimmed)) {
            alert('Subject name can only contain letters, numbers and spaces');
            continue; // Ask again
        }
        
        if (onlyDigits.test(subjectNameTrimmed)) {
            alert('Subject name cannot be only numbers');
            continue; // Ask again
        }
        
        return subjectNameTrimmed;
    }
}

// Function to get valid max marks with retry logic
async function getValidMaxMarks(currentValue = '100') {
    while (true) {
        const maxMarks = prompt('Enter new maximum marks:', currentValue);
        
        // User cancelled
        if (maxMarks === null) {
            return null;
        }
        
        const maxMarksTrimmed = maxMarks.trim();
        
        // Validate max marks
        if (maxMarksTrimmed === "") {
            alert('Maximum marks cannot be empty!');
            continue; // Ask again
        }
        
        const num = /^\d+$/;
        if (!num.test(maxMarksTrimmed)) {
            alert('Maximum marks can only be positive number');
            continue; // Ask again
        }
        
        const marksValue = parseInt(maxMarksTrimmed);
        if (marksValue < 1) {
            alert('Maximum marks must be at least 1');
            continue; // Ask again
        }
        
        return marksValue;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const classSelect = document.getElementById('classSelect');
    const loadClassBtn = document.getElementById('loadClassBtn');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    const classInfo = document.getElementById('classInfo');
    const addSubjectForm = document.getElementById('addSubjectForm');
    const subjectsTableContainer = document.getElementById('subjectsTableContainer');
    const noClassSelected = document.getElementById('noClassSelected');
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    const resetSubjectFormBtn = document.getElementById('resetSubjectFormBtn');

    let currentClassId = null;
    let allClasses = [];

    // Load all classes on page load
    loadAllClasses();

    loadClassBtn.addEventListener('click', function() {
        const selectedClassId = classSelect.value;
        
        if (!selectedClassId) {
            alert('Please select a class first!');
            return;
        }
        
        currentClassId = selectedClassId;
        loadClassData(selectedClassId);
    });
    
    clearSelectionBtn.addEventListener('click', function() {
        classSelect.value = '';
        currentClassId = null;
        classInfo.style.display = 'none';
        addSubjectForm.style.display = 'none';
        subjectsTableContainer.style.display = 'none';
        noClassSelected.style.display = 'block';
    });
    
    addSubjectBtn.addEventListener('click', function() {
        addNewSubject();
    });
    
    resetSubjectFormBtn.addEventListener('click', function() {
        document.getElementById('subjectName').value = '';
        document.getElementById('maxMarks').value = '100';
    });

    // Function to load all classes from backend
    async function loadAllClasses() {
        try {
            const response = await fetch(`${API_BASE_URL}/classes`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                allClasses = data.classes;
                populateClassSelect(allClasses);
            } else {
                throw new Error(data.error || 'Failed to load classes');
            }
        } catch (error) {
            console.error('Error loading classes:', error);
            alert('Error loading classes: ' + error.message);
        }
    }

    // Populate class dropdown
    function populateClassSelect(classes) {
        classSelect.innerHTML = '<option value="">-- Select a Class --</option>';
        
        classes.forEach((classItem, index) => {
            const option = document.createElement('option');
            option.value = classItem.class_id;
            option.textContent = `Class ${index + 1} - ${classItem.class_name}`;
            classSelect.appendChild(option);
        });
    }

    // Load specific class data
    async function loadClassData(classId) {
        try {
            // Load class details
            const classResponse = await fetch(`${API_BASE_URL}/classes/${classId}`);
            
            if (!classResponse.ok) {
                throw new Error(`HTTP error! status: ${classResponse.status}`);
            }
            
            const classData = await classResponse.json();
            
            if (classData.success) {
                displayClassInfo(classData.class);
                loadSubjectsForClass(classId);
            } else {
                throw new Error(classData.error || 'Failed to load class data');
            }
        } catch (error) {
            console.error('Error loading class data:', error);
            alert('Error loading class data: ' + error.message);
        }
    }

    // Display class information
    function displayClassInfo(classItem) {
        const classIndex = allClasses.findIndex(c => c.class_id == classItem.class_id) + 1;
        
        document.getElementById('classNameDisplay').textContent = 
            `Class ${classIndex} - ${classItem.class_name}`;
        document.getElementById('studentCount').textContent = classItem.student_count || 0;
        document.getElementById('subjectCount').textContent = classItem.subject_count || 0;
        document.getElementById('teacherCount').textContent = classItem.teacher_count || 0;
        
        classInfo.style.display = 'block';
        addSubjectForm.style.display = 'block';
        subjectsTableContainer.style.display = 'block';
        noClassSelected.style.display = 'none';
    }

    // Load subjects for a specific class
    async function loadSubjectsForClass(classId) {
        try {
            // First get the class to know the class_number
            const classResponse = await fetch(`${API_BASE_URL}/classes/${classId}`);
            const classData = await classResponse.json();
            
            if (!classData.success) {
                throw new Error(classData.error || 'Failed to get class information');
            }
            
            const classNumber = classData.class.class_number;
            
            // Load subjects for this class number
            const response = await fetch(`${API_BASE_URL}/subjects/class/${classNumber}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    // No subjects found for this class
                    displaySubjects([]);
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                displaySubjects(data.subjects);
            } else {
                throw new Error(data.error || 'Failed to load subjects');
            }
        } catch (error) {
            console.error('Error loading subjects:', error);
            // If endpoint doesn't exist, show empty table
            if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
                displaySubjects([]);
            } else {
                alert('Error loading subjects: ' + error.message);
            }
        }
    }

    // Display subjects in the table
    function displaySubjects(subjects) {
        const tableBody = document.getElementById('subjectsTableBody');
        
        if (subjects.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No subjects found for this class</td></tr>';
            return;
        }
        
        tableBody.innerHTML = subjects.map((subject, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${subject.subject_name}</td>
                <td>${subject.max_marks || 100}</td>
                <td>${subject.student_count || 0}</td>
                <td class="action-buttons">
                    <button class="btn-small btn-edit" onclick="editSubject(${subject.subject_id}, '${subject.subject_name}', ${subject.max_marks || 100})">Edit</button>
                    <button class="btn-small btn-danger" onclick="deleteSubject(${subject.subject_id})">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    // Add new subject
    async function addNewSubject() {
        const subjectName = document.getElementById('subjectName').value.trim();
        const maxMarks = document.getElementById('maxMarks').value.trim();
        
        // Validate input
        const validation = validateSubjectInput(subjectName, maxMarks);
        
        if (!validation.success) {
            alert("Validation error: " + validation.message);
            return;
        }
        
        if (!currentClassId) {
            alert('Please select a class first!');
            return;
        }

        try {
            // Get class number from current class
            const classResponse = await fetch(`${API_BASE_URL}/classes/${currentClassId}`);
            const classData = await classResponse.json();
            
            if (!classData.success) {
                throw new Error(classData.error || 'Failed to get class information');
            }
            
            const classNumber = classData.class.class_number;
            
            const response = await fetch(`${API_BASE_URL}/subjects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subjectName: subjectName,
                    classNumber: classNumber,
                    maxMarks: parseInt(maxMarks) || 100
                })
            });
            
            
            const data = await response.json();
            
            if (data.success) {
                alert(`Subject "${subjectName}" added successfully!`);
                document.getElementById('subjectName').value = '';
                document.getElementById('maxMarks').value = '100';
                
                // Reload subjects
                loadSubjectsForClass(currentClassId);
                
                // Reload class data to update subject count
                loadClassData(currentClassId);
            } else {
                throw new Error(data.error || 'Failed to add subject');
            }
        } catch (error) {
            console.error('Error adding subject:', error);
            alert('Error adding subject: ' + error.message);
        }
    }
});

// Edit subject function
async function editSubject(subjectId, currentSubjectName = '', currentMaxMarks = 100) {
    // Get valid subject name (will keep asking until valid or cancelled)
    const newSubjectName = await getValidSubjectName(currentSubjectName);
    if (newSubjectName === null) return; // User cancelled
    
    // Get valid max marks (will keep asking until valid or cancelled)
    const newMaxMarks = await getValidMaxMarks(currentMaxMarks.toString());
    if (newMaxMarks === null) return; // User cancelled
    
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                subjectName: newSubjectName,
                maxMarks: newMaxMarks
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            alert('Subject updated successfully!');
            // Reload the page to reflect changes
            location.reload();
        } else {
            throw new Error(data.error || 'Failed to update subject');
        }
    } catch (error) {
        console.error('Error updating subject:', error);
        alert('Error updating subject: ' + error.message);
    }
}

// Delete subject function
async function deleteSubject(subjectId) {
    if (!confirm('Are you sure you want to delete this subject? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            alert('Subject deleted successfully!');
            // Reload the page to reflect changes
            location.reload();
        } else {
            throw new Error(data.error || 'Failed to delete subject');
        }
    } catch (error) {
        console.error('Error deleting subject:', error);
        alert('Error deleting subject: ' + error.message);
    }
}