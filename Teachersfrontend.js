// Teachersfrontend.js
class TeachersManager {
    constructor() {
        this.teachers = [];
        this.assignments = [];
        this.classes = [];
        this.subjects = [];
        this.currentPage = 1;
        this.currentAssignmentPage = 1;
        this.itemsPerPage = 10;
        this.currentSort = { field: 'name', direction: 'asc' };
        this.currentFilters = {};
        this.currentAssignmentFilters = {};
        this.currentTeacherId = null;
        this.currentAssignmentId = null;

        this.initializeEventListeners();
        this.loadInitialData();
    }

    initializeEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Teacher management
        document.getElementById('addTeacherBtn').addEventListener('click', () => this.openAddTeacherModal());
        document.getElementById('refreshBtn').addEventListener('click', () => this.loadTeachers());
        document.getElementById('applyFiltersBtn').addEventListener('click', () => this.applyFilters());
        document.getElementById('resetFiltersBtn').addEventListener('click', () => this.resetFilters());
        document.getElementById('searchBtn').addEventListener('click', () => this.searchTeachers());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchTeachers();
        });

        // Assignment management
        document.getElementById('assignTeacherBtn').addEventListener('click', () => this.openAssignTeacherModal());
        document.getElementById('refreshAssignmentsBtn').addEventListener('click', () => this.loadAssignments());
        document.getElementById('applyAssignmentFiltersBtn').addEventListener('click', () => this.applyAssignmentFilters());
        document.getElementById('resetAssignmentFiltersBtn').addEventListener('click', () => this.resetAssignmentFilters());
        document.getElementById('assignmentSearchBtn').addEventListener('click', () => this.searchAssignments());
        document.getElementById('assignmentSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchAssignments();
        });

        // Pagination
        document.getElementById('prevPage').addEventListener('click', () => this.previousPage());
        document.getElementById('nextPage').addEventListener('click', () => this.nextPage());
        document.getElementById('prevAssignmentPage').addEventListener('click', () => this.previousAssignmentPage());
        document.getElementById('nextAssignmentPage').addEventListener('click', () => this.nextAssignmentPage());

        // Table sorting
        document.querySelectorAll('.teachers-table th.sortable').forEach(th => {
            th.addEventListener('click', () => this.sortTeachers(th.dataset.sort));
        });
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadTeachers(),
                this.loadAssignments(),
                this.loadClasses(),
                this.loadSubjects()
            ]);
            this.updateStats();
        } catch (error) {
            this.showError('Failed to load initial data: ' + error.message);
        }
    }

    async loadTeachers() {
        try {
            const response = await fetch('/api/teachers');
            if (!response.ok) throw new Error('Failed to fetch teachers');
            const data = await response.json();
            this.teachers = data.teachers || [];
            this.renderTeachersTable();
            this.updateStats();
        } catch (error) {
            this.showError('Failed to load teachers: ' + error.message);
            this.teachers = [];
            this.renderTeachersTable();
        }
    }

    async loadAssignments() {
        try {
            const response = await fetch('/api/teacher-assignments');
            if (!response.ok) throw new Error('Failed to fetch assignments');
            const data = await response.json();
            this.assignments = data.assignments || [];
            this.renderAssignmentsTable();
            this.updateStats();
        } catch (error) {
            this.showError('Failed to load assignments: ' + error.message);
            this.assignments = [];
            this.renderAssignmentsTable();
        }
    }

    async loadClasses() {
        try {
            const response = await fetch('/api/classes');
            if (!response.ok) throw new Error('Failed to fetch classes');
            const data = await response.json();
            this.classes = data.classes || [];
            this.populateClassDropdowns();
        } catch (error) {
            this.showError('Failed to load classes: ' + error.message);
            this.classes = [];
        }
    }

    async loadSubjects() {
        try {
            const response = await fetch('/api/subjects');
            if (!response.ok) throw new Error('Failed to fetch subjects');
            const data = await response.json();
            this.subjects = data.subjects || [];
            this.populateSubjectDropdowns();
        } catch (error) {
            this.showError('Failed to load subjects: ' + error.message);
            this.subjects = [];
        }
    }

    populateClassDropdowns() {
        const dropdowns = [
            'assignmentClassFilter',
            'assignClassSelect',
            'editAssignClassSelect'
        ];

        dropdowns.forEach(dropdownId => {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                // Clear existing options except the first one
                while (dropdown.children.length > 1) {
                    dropdown.removeChild(dropdown.lastChild);
                }

                // Add class options
                this.classes.forEach(classItem => {
                    const option = document.createElement('option');
                    option.value = classItem.class_number;
                    option.textContent = `Class ${classItem.class_number} - ${classItem.class_name}`;
                    dropdown.appendChild(option);
                });
            }
        });

        // Populate teacher filter dropdown
        this.populateTeacherFilterDropdown();
    }

    populateSubjectDropdowns() {
        const dropdowns = [
            'assignmentSubjectFilter',
            'editAssignSubjectSelect'
        ];

        dropdowns.forEach(dropdownId => {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                // Clear existing options except the first one
                while (dropdown.children.length > 1) {
                    dropdown.removeChild(dropdown.lastChild);
                }

                // Add subject options
                this.subjects.forEach(subject => {
                    const option = document.createElement('option');
                    option.value = subject.subject_id;
                    option.textContent = subject.subject_name;
                    dropdown.appendChild(option);
                });
            }
        });
    }

    populateTeacherFilterDropdown() {
        const dropdown = document.getElementById('assignmentTeacherFilter');
        if (dropdown) {
            // Clear existing options except the first one
            while (dropdown.children.length > 1) {
                dropdown.removeChild(dropdown.lastChild);
            }

            // Add teacher options
            this.teachers.forEach(teacher => {
                const option = document.createElement('option');
                option.value = teacher.teacher_id;
                option.textContent = teacher.name;
                dropdown.appendChild(option);
            });
        }
    }

    async loadSubjectsForClass() {
        const classNumber = document.getElementById('assignClassSelect').value;
        const container = document.getElementById('subjectsContainer');
        const section = document.getElementById('subjectsAssignmentSection');

        if (!classNumber) {
            section.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`/api/subjects/class/${classNumber}`);
            if (!response.ok) throw new Error('Failed to fetch subjects for class');
            const data = await response.json();
            const classSubjects = data.subjects || [];

            container.innerHTML = '';
            
            if (classSubjects.length === 0) {
                container.innerHTML = '<p style="color: var(--text); opacity: 0.7;">No subjects found for this class.</p>';
                section.style.display = 'block';
                return;
            }

            classSubjects.forEach(subject => {
                const subjectDiv = document.createElement('div');
                subjectDiv.className = 'subject-assignment';
                subjectDiv.innerHTML = `
                    <h5>${subject.subject_name}</h5>
                    <div class="form-group">
                        <label>
                            <input type="checkbox" class="subject-checkbox" value="${subject.subject_id}" 
                                   data-subject-name="${subject.subject_name}">
                            Assign teacher to this subject
                        </label>
                    </div>
                `;
                container.appendChild(subjectDiv);
            });

            section.style.display = 'block';
        } catch (error) {
            this.showError('Failed to load subjects: ' + error.message);
        }
    }

    renderTeachersTable() {
        const tbody = document.getElementById('teachersTableBody');
        const filteredTeachers = this.applyTeacherFiltersAndSorting();
        const paginatedTeachers = this.paginateData(filteredTeachers, this.currentPage);

        if (paginatedTeachers.data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 40px; color: var(--text); opacity: 0.7;">
                        No teachers found matching your criteria.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = paginatedTeachers.data.map(teacher => `
            <tr>
                <td>${teacher.teacher_id}</td>
                <td>${teacher.name}</td>
                <td>${teacher.email || '-'}</td>
                <td>${teacher.phone || '-'}</td>
                <td>${teacher.qualification || '-'}</td>
                <td>
                    <span class="age-badge ${this.getAgeCategory(teacher.age)}">
                        ${teacher.age || 'N/A'}
                    </span>
                </td>
                <td>
                    <span class="gender-${teacher.gender?.toLowerCase() || 'other'}">
                        ${teacher.gender || '-'}
                    </span>
                </td>
                <td>${teacher.hire_date ? new Date(teacher.hire_date).toLocaleDateString() : '-'}</td>
                <td>
                    <span class="assignment-status ${this.isTeacherAssigned(teacher.teacher_id) ? 'assigned' : 'unassigned'}">
                        ${this.isTeacherAssigned(teacher.teacher_id) ? 'Assigned' : 'Unassigned'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-warning btn-small" onclick="teachersManager.openEditTeacherModal(${teacher.teacher_id})">
                            ✏️ Edit
                        </button>
                        <button class="btn-danger btn-small" onclick="teachersManager.deleteTeacher(${teacher.teacher_id})">
                            🗑️ Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.updatePagination('pageInfo', paginatedTeachers);
    }

    renderAssignmentsTable() {
        const tbody = document.getElementById('assignmentsTableBody');
        const filteredAssignments = this.applyAssignmentFilters();
        const paginatedAssignments = this.paginateData(filteredAssignments, this.currentAssignmentPage);

        if (paginatedAssignments.data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text); opacity: 0.7;">
                        No assignments found matching your criteria.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = paginatedAssignments.data.map(assignment => {
            const teacher = this.teachers.find(t => t.teacher_id === assignment.teacher_id);
            const subject = this.subjects.find(s => s.subject_id === assignment.subject_id);
            const classInfo = this.classes.find(c => c.class_number === assignment.class_number);
            
            return `
                <tr>
                    <td>${assignment.assignment_id}</td>
                    <td>${teacher?.name || 'Unknown Teacher'}</td>
                    <td>Class ${assignment.class_number}${classInfo ? ` - ${classInfo.class_name}` : ''}</td>
                    <td>${subject?.subject_name || 'Unknown Subject'}</td>
                    <td>${new Date(assignment.created_at).toLocaleDateString()}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-warning btn-small" onclick="teachersManager.openEditAssignmentModal(${assignment.assignment_id})">
                                ✏️ Edit
                            </button>
                            <button class="btn-danger btn-small" onclick="teachersManager.deleteAssignment(${assignment.assignment_id})">
                                🗑️ Delete
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        this.updatePagination('assignmentPageInfo', paginatedAssignments);
    }

    applyTeacherFiltersAndSorting() {
        let filtered = [...this.teachers];

        // Apply search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(teacher => 
                teacher.name.toLowerCase().includes(searchTerm)
            );
        }

        // Apply qualification filter
        if (this.currentFilters.qualification) {
            filtered = filtered.filter(teacher => 
                teacher.qualification === this.currentFilters.qualification
            );
        }

        // Apply gender filter
        if (this.currentFilters.gender) {
            filtered = filtered.filter(teacher => 
                teacher.gender === this.currentFilters.gender
            );
        }

        // Apply age filter
        if (this.currentFilters.age) {
            filtered = filtered.filter(teacher => {
                if (!teacher.age) return false;
                const ageRange = this.currentFilters.age;
                if (ageRange === '51+') return teacher.age >= 51;
                const [min, max] = ageRange.split('-').map(Number);
                return teacher.age >= min && teacher.age <= max;
            });
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue = a[this.currentSort.field];
            let bValue = b[this.currentSort.field];

            if (this.currentSort.field === 'hire_date') {
                aValue = new Date(aValue || 0);
                bValue = new Date(bValue || 0);
            }

            if (aValue < bValue) return this.currentSort.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }

    applyAssignmentFilters() {
        let filtered = [...this.assignments];

        // Apply search filter
        if (this.currentAssignmentFilters.search) {
            const searchTerm = this.currentAssignmentFilters.search.toLowerCase();
            filtered = filtered.filter(assignment => {
                const teacher = this.teachers.find(t => t.teacher_id === assignment.teacher_id);
                return teacher?.name.toLowerCase().includes(searchTerm);
            });
        }

        // Apply teacher filter
        if (this.currentAssignmentFilters.teacher) {
            filtered = filtered.filter(assignment => 
                assignment.teacher_id === parseInt(this.currentAssignmentFilters.teacher)
            );
        }

        // Apply class filter
        if (this.currentAssignmentFilters.class) {
            filtered = filtered.filter(assignment => 
                assignment.class_number === parseInt(this.currentAssignmentFilters.class)
            );
        }

        // Apply subject filter
        if (this.currentAssignmentFilters.subject) {
            filtered = filtered.filter(assignment => 
                assignment.subject_id === parseInt(this.currentAssignmentFilters.subject)
            );
        }

        return filtered;
    }

    paginateData(data, page) {
        const startIndex = (page - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const totalPages = Math.ceil(data.length / this.itemsPerPage);

        return {
            data: data.slice(startIndex, endIndex),
            currentPage: page,
            totalPages: totalPages,
            totalItems: data.length
        };
    }

    updatePagination(elementId, paginationData) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = `Page ${paginationData.currentPage} of ${paginationData.totalPages}`;
        }
    }

    updateStats() {
        const totalTeachers = this.teachers.length;
        const maleTeachers = this.teachers.filter(t => t.gender === 'Male').length;
        const femaleTeachers = this.teachers.filter(t => t.gender === 'Female').length;
        const assignedTeachers = new Set(this.assignments.map(a => a.teacher_id)).size;

        document.getElementById('totalTeachers').textContent = totalTeachers;
        document.getElementById('maleTeachers').textContent = maleTeachers;
        document.getElementById('femaleTeachers').textContent = femaleTeachers;
        document.getElementById('assignedTeachers').textContent = assignedTeachers;
    }

    // Modal Management
    openAddTeacherModal() {
        document.getElementById('addTeacherForm').reset();
        this.openModal('addTeacherModal');
    }

    openEditTeacherModal(teacherId) {
        const teacher = this.teachers.find(t => t.teacher_id === teacherId);
        if (!teacher) return;

        document.getElementById('editTeacherName').value = teacher.name;
        document.getElementById('editTeacherEmail').value = teacher.email || '';
        document.getElementById('editTeacherPhone').value = teacher.phone || '';
        document.getElementById('editTeacherQualification').value = teacher.qualification || '';
        document.getElementById('editTeacherAge').value = teacher.age || '';
        document.getElementById('editTeacherGender').value = teacher.gender || '';
        document.getElementById('editTeacherHireDate').value = teacher.hire_date || '';

        this.currentTeacherId = teacherId;
        this.openModal('editTeacherModal');
    }

    openAssignTeacherModal() {
        document.getElementById('assignTeacherForm').reset();
        document.getElementById('subjectsAssignmentSection').style.display = 'none';
        this.populateTeacherDropdown('assignTeacherSelect');
        this.openModal('assignTeacherModal');
    }

    openEditAssignmentModal(assignmentId) {
        const assignment = this.assignments.find(a => a.assignment_id === assignmentId);
        if (!assignment) return;

        this.populateTeacherDropdown('editAssignTeacherSelect', assignment.teacher_id);
        document.getElementById('editAssignClassSelect').value = assignment.class_number;
        this.populateSubjectDropdown('editAssignSubjectSelect', assignment.subject_id);

        this.currentAssignmentId = assignmentId;
        this.openModal('editAssignmentModal');
    }

    populateTeacherDropdown(dropdownId, selectedTeacherId = null) {
        const dropdown = document.getElementById(dropdownId);
        dropdown.innerHTML = '<option value="">Select Teacher</option>';
        
        this.teachers.forEach(teacher => {
            const option = document.createElement('option');
            option.value = teacher.teacher_id;
            option.textContent = teacher.name;
            if (teacher.teacher_id === selectedTeacherId) {
                option.selected = true;
            }
            dropdown.appendChild(option);
        });
    }

    populateSubjectDropdown(dropdownId, selectedSubjectId = null) {
        const dropdown = document.getElementById(dropdownId);
        dropdown.innerHTML = '<option value="">Select Subject</option>';
        
        this.subjects.forEach(subject => {
            const option = document.createElement('option');
            option.value = subject.subject_id;
            option.textContent = subject.subject_name;
            if (subject.subject_id === selectedSubjectId) {
                option.selected = true;
            }
            dropdown.appendChild(option);
        });
    }

    openModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    // CRUD Operations
    async addTeacher() {
        const formData = {
            name: document.getElementById('teacherName').value,
            email: document.getElementById('teacherEmail').value,
            phone: document.getElementById('teacherPhone').value,
            qualification: document.getElementById('teacherQualification').value,
            age: document.getElementById('teacherAge').value ? parseInt(document.getElementById('teacherAge').value) : null,
            gender: document.getElementById('teacherGender').value,
            hire_date: document.getElementById('teacherHireDate').value
        };

        if (!formData.name) {
            this.showError('Name is required field.');
            return;
        }

        try {
            const response = await fetch('/api/teachers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add teacher');
            }

            this.closeModal('addTeacherModal');
            this.showSuccess('Teacher added successfully!');
            await this.loadTeachers();
        } catch (error) {
            this.showError('Failed to add teacher: ' + error.message);
        }
    }

    async updateTeacher() {
        if (!this.currentTeacherId) return;

        const formData = {
            name: document.getElementById('editTeacherName').value,
            email: document.getElementById('editTeacherEmail').value,
            phone: document.getElementById('editTeacherPhone').value,
            qualification: document.getElementById('editTeacherQualification').value,
            age: document.getElementById('editTeacherAge').value ? parseInt(document.getElementById('editTeacherAge').value) : null,
            gender: document.getElementById('editTeacherGender').value,
            hire_date: document.getElementById('editTeacherHireDate').value
        };

        if (!formData.name) {
            this.showError('Name is required field.');
            return;
        }

        try {
            const response = await fetch(`/api/teachers/${this.currentTeacherId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update teacher');
            }

            this.closeModal('editTeacherModal');
            this.showSuccess('Teacher updated successfully!');
            await this.loadTeachers();
        } catch (error) {
            this.showError('Failed to update teacher: ' + error.message);
        }
    }

    async deleteTeacher(teacherId) {
        if (!confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/teachers/${teacherId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete teacher');
            }

            this.showSuccess('Teacher deleted successfully!');
            await this.loadTeachers();
            await this.loadAssignments();
        } catch (error) {
            this.showError('Failed to delete teacher: ' + error.message);
        }
    }

    async assignTeacherToSubjects() {
        const classNumber = document.getElementById('assignClassSelect').value;
        const teacherId = document.getElementById('assignTeacherSelect').value;
        const selectedSubjects = Array.from(document.querySelectorAll('.subject-checkbox:checked'))
            .map(checkbox => parseInt(checkbox.value));

        if (!classNumber || !teacherId) {
            this.showError('Please select both class and teacher.');
            return;
        }

        if (selectedSubjects.length === 0) {
            this.showError('Please select at least one subject to assign.');
            return;
        }

        try {
            // Check for existing assignments to avoid duplicates
            const existingAssignments = this.assignments.filter(a => 
                a.teacher_id === parseInt(teacherId) && 
                a.class_number === parseInt(classNumber)
            );

            const newAssignments = selectedSubjects.filter(subjectId => 
                !existingAssignments.some(existing => 
                    existing.subject_id === subjectId
                )
            );

            if (newAssignments.length === 0) {
                this.showError('Teacher is already assigned to all selected subjects for this class.');
                return;
            }

            // Create new assignments
            for (const subjectId of newAssignments) {
                const assignmentData = {
                    teacher_id: parseInt(teacherId),
                    class_number: parseInt(classNumber),
                    subject_id: subjectId
                };

                const response = await fetch('/api/teacher-assignments', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(assignmentData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Failed to create assignment');
                }
            }

            this.closeModal('assignTeacherModal');
            this.showSuccess(`Teacher assigned to ${newAssignments.length} subject(s) successfully!`);
            await this.loadAssignments();
        } catch (error) {
            this.showError('Failed to assign teacher: ' + error.message);
        }
    }

    async updateAssignment() {
        if (!this.currentAssignmentId) return;

        const formData = {
            teacher_id: parseInt(document.getElementById('editAssignTeacherSelect').value),
            class_number: parseInt(document.getElementById('editAssignClassSelect').value),
            subject_id: parseInt(document.getElementById('editAssignSubjectSelect').value)
        };

        if (!formData.teacher_id || !formData.class_number || !formData.subject_id) {
            this.showError('All fields are required.');
            return;
        }

        try {
            const response = await fetch(`/api/teacher-assignments/${this.currentAssignmentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update assignment');
            }

            this.closeModal('editAssignmentModal');
            this.showSuccess('Assignment updated successfully!');
            await this.loadAssignments();
        } catch (error) {
            this.showError('Failed to update assignment: ' + error.message);
        }
    }

    async deleteAssignment(assignmentId) {
        if (!confirm('Are you sure you want to delete this assignment?')) {
            return;
        }

        try {
            const response = await fetch(`/api/teacher-assignments/${assignmentId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete assignment');
            }

            this.showSuccess('Assignment deleted successfully!');
            await this.loadAssignments();
        } catch (error) {
            this.showError('Failed to delete assignment: ' + error.message);
        }
    }

    // Utility Methods
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tabName + 'Tab');
        });
    }

    applyFilters() {
        this.currentFilters = {
            qualification: document.getElementById('qualificationFilter').value,
            gender: document.getElementById('genderFilter').value,
            age: document.getElementById('ageFilter').value,
            search: document.getElementById('searchInput').value
        };
        this.currentPage = 1;
        this.renderTeachersTable();
    }

    resetFilters() {
        document.getElementById('qualificationFilter').value = '';
        document.getElementById('genderFilter').value = '';
        document.getElementById('ageFilter').value = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('sortBy').value = 'name';
        this.currentFilters = {};
        this.currentSort = { field: 'name', direction: 'asc' };
        this.currentPage = 1;
        this.renderTeachersTable();
    }

    searchTeachers() {
        this.currentFilters.search = document.getElementById('searchInput').value;
        this.currentPage = 1;
        this.renderTeachersTable();
    }

    applyAssignmentFilters() {
        this.currentAssignmentFilters = {
            teacher: document.getElementById('assignmentTeacherFilter').value,
            class: document.getElementById('assignmentClassFilter').value,
            subject: document.getElementById('assignmentSubjectFilter').value,
            search: document.getElementById('assignmentSearchInput').value
        };
        this.currentAssignmentPage = 1;
        this.renderAssignmentsTable();
    }

    resetAssignmentFilters() {
        document.getElementById('assignmentTeacherFilter').value = '';
        document.getElementById('assignmentClassFilter').value = '';
        document.getElementById('assignmentSubjectFilter').value = '';
        document.getElementById('assignmentSearchInput').value = '';
        this.currentAssignmentFilters = {};
        this.currentAssignmentPage = 1;
        this.renderAssignmentsTable();
    }

    searchAssignments() {
        this.currentAssignmentFilters.search = document.getElementById('assignmentSearchInput').value;
        this.currentAssignmentPage = 1;
        this.renderAssignmentsTable();
    }

    sortTeachers(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }
        this.renderTeachersTable();
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTeachersTable();
        }
    }

    nextPage() {
        const filteredTeachers = this.applyTeacherFiltersAndSorting();
        const totalPages = Math.ceil(filteredTeachers.length / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTeachersTable();
        }
    }

    previousAssignmentPage() {
        if (this.currentAssignmentPage > 1) {
            this.currentAssignmentPage--;
            this.renderAssignmentsTable();
        }
    }

    nextAssignmentPage() {
        const filteredAssignments = this.applyAssignmentFilters();
        const totalPages = Math.ceil(filteredAssignments.length / this.itemsPerPage);
        if (this.currentAssignmentPage < totalPages) {
            this.currentAssignmentPage++;
            this.renderAssignmentsTable();
        }
    }

    getAgeCategory(age) {
        if (!age) return 'age-young';
        if (age <= 30) return 'age-young';
        if (age <= 45) return 'age-middle';
        return 'age-senior';
    }

    isTeacherAssigned(teacherId) {
        return this.assignments.some(assignment => assignment.teacher_id === teacherId);
    }

    showError(message) {
        alert('Error: ' + message);
        console.error('Error:', message);
    }

    showSuccess(message) {
        alert('Success: ' + message);
        console.log('Success:', message);
    }
}

// Global functions for HTML onclick handlers
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function addTeacher() {
    teachersManager.addTeacher();
}

function updateTeacher() {
    teachersManager.updateTeacher();
}

function assignTeacherToSubjects() {
    teachersManager.assignTeacherToSubjects();
}

function updateAssignment() {
    teachersManager.updateAssignment();
}

function loadSubjectsForClass() {
    teachersManager.loadSubjectsForClass();
}

// Initialize the application
let teachersManager;
document.addEventListener('DOMContentLoaded', function() {
    teachersManager = new TeachersManager();
});