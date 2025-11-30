// Get HTML elements
const classNameInput = document.getElementById("className");
const classNumberInput = document.getElementById("classNumber");
const addClassBtn = document.getElementById("addClassBtn");
const resetFormBtn = document.getElementById("resetFormBtn");

const API_BASE = 'http://localhost:3000';

// Track if we're in edit mode
let isEditing = false;
let currentEditClassId = null;

function validateClassInput(className, classNumber) {
    // Check if class name is empty
    if (className === "") {
        return { success: false, message: 'Class Name cannot be empty' };
    }

    // Check if class number is empty
    if (classNumber === "") {
        return { success: false, message: 'Class Number cannot be empty' };
    }

    // Class name validation: allows letters, numbers, and spaces but not only numbers
    const namechecker = /^[a-zA-Z0-9\s]+$/;
    const isvalid = namechecker.test(className);
    const onlyDigits = /^\d+$/;

    if (!isvalid) {
        return { success: false, message: 'Class name can only contain letters, numbers and spaces' };
    }

    if (onlyDigits.test(className)) {
        return { success: false, message: 'Class name cannot be only numbers' };
    }

    // Class number validation: only positive digits (no negative, no letters, no symbols)
    const num = /^\d+$/;
    const isvalidnum = num.test(classNumber);

    if (!isvalidnum) {
        return { success: false, message: 'Class Number can only be positive number' };
    }

    return { success: true, message: 'Valid input' };
}

async function handleFormSubmit() {
    const className = classNameInput.value.trim();
    const classNumber = classNumberInput.value.trim();

    const validation = validateClassInput(className, classNumber);

    if (!validation.success) {
        alert("Validation error: " + validation.message);
        return;
    }

    if (isEditing && currentEditClassId) {
        // Update existing class
        await updateClass(currentEditClassId, className, classNumber);
    } else {
        // Add new class
        await addClass(className, classNumber);
    }
}

async function addClass(className, classNumber) {
    try {
        const response = await fetch(`${API_BASE}/api/classes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                className: className,
                classNumber: parseInt(classNumber)
            })
        });

        const result = await response.json();
        if (result.success) {
            alert('Class Added Successfully!');
            resetToAddMode();
            await loadClasses();
        } else {
            alert("Error: " + result.error);
        }
        return result;
    } catch (error) {
        alert('Failed to Add Class');
        console.error('Error:', error);
    }
}

function resetForm() {
    classNameInput.value = "";
    classNumberInput.value = "";
}

function resetToAddMode() {
    resetForm();
    isEditing = false;
    currentEditClassId = null;
    addClassBtn.textContent = "Add Class";
}

async function editClass(classId) {
    try {
        const response = await fetch(`${API_BASE}/api/classes/${classId}`);
        const result = await response.json();

        if (result.success) {
            const cls = result.class;
            // Populate form with existing data
            classNameInput.value = cls.class_name;
            classNumberInput.value = cls.class_number;

            // Set edit mode
            isEditing = true;
            currentEditClassId = classId;
            addClassBtn.textContent = "Update Class";

            // Scroll to form
            classNameInput.focus();
        } else {
            alert("Error loading class: " + result.error);
        }
    } catch (error) {
        alert("Failed to load class details");
        console.error('Error:', error);
    }
}

async function updateClass(classId, newClassName, newClassNumber) {
    const validation = validateClassInput(newClassName, newClassNumber);

    if (!validation.success) {
        alert("Validation error: " + validation.message);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/classes/${classId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                className: newClassName,
                classNumber: parseInt(newClassNumber)
            })
        });

        const result = await response.json();

        if (result.success) {
            alert("Class updated successfully!");
            resetToAddMode();
            await loadClasses();
        } else {
            alert("Error: " + result.error);
        }

        return result;

    } catch (error) {
        alert('Failed to update class');
        console.error('Error:', error);
    }
}

async function loadClasses() {
    try {
        const response = await fetch(`${API_BASE}/api/classes`);
        const result = await response.json();

        if (result.success) {
            displayClasses(result.classes);
            updateStatistics(result.classes);
        } else {
            alert('Error loading classes: ' + result.error);
        }
    } catch (error) {
        alert('Failed to load classes');
        console.error('Error:', error);
    }
}

function displayClasses(classes) {
    const tableBody = document.getElementById('classesTableBody');

    if (classes.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No classes found</td></tr>';
        return;
    }

    tableBody.innerHTML = classes.map((cls, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${cls.class_name}</td>
            <td>${cls.class_number}</td>
            <td>${cls.student_count || 0}</td>
            <td>${cls.teacher_count || 0}</td>
            <td>${cls.subject_count || 0}</td>
            <td class="action-buttons">
                <button class="btn-small btn-edit" onclick="editClass(${cls.class_id})">Edit</button>
                <button class="btn-small btn-danger" onclick="deleteClass(${cls.class_id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function updateStatistics(classes) {
    const totalClasses = classes.length;
    const totalStudents = classes.reduce((sum, cls) => sum + (cls.student_count || 0), 0);
    const totalTeachers = classes.reduce((sum, cls) => sum + (cls.teacher_count || 0), 0);
    const totalSubjects = classes.reduce((sum, cls) => sum + (cls.subject_count || 0), 0);

    document.getElementById('total-classes').textContent = totalClasses;
    document.getElementById('total-students').textContent = totalStudents;
    document.getElementById('total-teachers').textContent = totalTeachers;
    document.getElementById('total-subjects').textContent = totalSubjects;
}

async function deleteClass(classId) {
    if (!confirm("Are you sure you want to delete this class?")) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/classes/${classId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            alert("Class deleted successfully!");
            await loadClasses();
        } else {
            alert("Error: " + result.error);
        }
    } catch (error) {
        alert('Failed to delete class');
        console.error('Error:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (addClassBtn) {
        addClassBtn.addEventListener('click', handleFormSubmit);
    }

    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', resetToAddMode);
    }

    loadClasses();
});