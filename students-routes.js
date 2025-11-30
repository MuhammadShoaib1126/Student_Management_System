// students-routes.js
const express = require('express');
const router = express.Router();

module.exports = (db) => {
    
    // GET all students with class info
    router.get('/', async (req, res) => {
        try {
            const [students] = await db.promise().query(`
                SELECT 
                    s.*, 
                    c.class_name
                FROM students s
                LEFT JOIN classes c ON s.class_number = c.class_number
                ORDER BY s.class_number, s.name
            `);
            
            res.json({
                success: true,
                students: students
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch students' 
            });
        }
    });

    // GET single student by ID
    router.get('/:id', async (req, res) => {
        const studentId = req.params.id;
        
        try {
            const [students] = await db.promise().query(`
                SELECT 
                    s.*, 
                    c.class_name
                FROM students s
                LEFT JOIN classes c ON s.class_number = c.class_number
                WHERE s.student_id = ?
            `, [studentId]);
            
            if (students.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Student not found'
                });
            }
            
            res.json({
                success: true,
                student: students[0]
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch student' 
            });
        }
    });

    // GET students by class number
    router.get('/class/:classNumber', async (req, res) => {
        const classNumber = req.params.classNumber;
        
        try {
            const [students] = await db.promise().query(`
                SELECT 
                    s.*, 
                    c.class_name
                FROM students s
                LEFT JOIN classes c ON s.class_number = c.class_number
                WHERE s.class_number = ?
                ORDER BY s.roll_number, s.name
            `, [classNumber]);
            
            res.json({
                success: true,
                students: students
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch students for class' 
            });
        }
    });

    // Validation functions
    const validateStudentData = (data, isUpdate = false) => {
        const errors = [];

        // Roll Number validation: English letters + digits only, no special characters
        if (!data.rollNumber || data.rollNumber.trim() === '') {
            errors.push('Roll number is required');
        } else if (data.rollNumber.length > 20) {
            errors.push('Roll number must be 20 characters or less');
        } else if (!/^[A-Za-z0-9]+$/.test(data.rollNumber)) {
            errors.push('Roll number can only contain letters and numbers, no special characters');
        }

        // Student Name validation: Only alphabets and spaces, cannot be empty or only digits
        if (!data.name || data.name.trim() === '') {
            errors.push('Student name is required');
        } else if (data.name.length > 100) {
            errors.push('Student name must be 100 characters or less');
        } else if (!/^[A-Za-z\s]+$/.test(data.name)) {
            errors.push('Student name can only contain letters and spaces');
        } else if (/^\d+$/.test(data.name)) {
            errors.push('Student name cannot be only numbers');
        }

        // Father Name validation: Only alphabets and spaces, cannot be empty or only digits
        if (!data.fname || data.fname.trim() === '') {
            errors.push('Father name is required');
        } else if (data.fname.length > 100) {
            errors.push('Father name must be 100 characters or less');
        } else if (!/^[A-Za-z\s]+$/.test(data.fname)) {
            errors.push('Father name can only contain letters and spaces');
        } else if (/^\d+$/.test(data.fname)) {
            errors.push('Father name cannot be only numbers');
        }

        // Class validation
        if (!data.classNumber) {
            errors.push('Class is required');
        }

        // Age validation: Positive digits only, between 5-25
        if (data.age !== null && data.age !== undefined && data.age !== '') {
            if (!/^\d+$/.test(data.age.toString())) {
                errors.push('Age must be a positive number');
            } else if (data.age < 5 || data.age > 25) {
                errors.push('Age must be between 5 and 25');
            }
        }

        // Gender validation
        if (data.gender && !['Male', 'Female', 'Other'].includes(data.gender)) {
            errors.push('Gender must be Male, Female, or Other');
        }

        // Address validation: Cannot be only digits
        if (data.address && data.address.trim() !== '') {
            if (/^\d+$/.test(data.address.replace(/\s/g, ''))) {
                errors.push('Address cannot be only numbers');
            }
            if (data.address.length > 500) {
                errors.push('Address must be 500 characters or less');
            }
        }

        // Phone validation: Positive digits only (allows spaces, hyphens, parentheses)
        if (data.phone && data.phone.trim() !== '') {
            const cleanPhone = data.phone.replace(/[\s\-\(\)]/g, '');
            if (!/^\d+$/.test(cleanPhone)) {
                errors.push('Phone number can only contain digits, spaces, hyphens, and parentheses');
            } else if (cleanPhone.length > 15) {
                errors.push('Phone number must be 15 digits or less');
            } else if (cleanPhone.length < 7) {
                errors.push('Phone number must be at least 7 digits');
            }
        }

        return errors;
    };

    // POST - Create new student
    router.post('/', async (req, res) => {
        const { rollNumber, name, fname, age, classNumber, gender, address, phone } = req.body;
        
        const formData = {
            rollNumber: rollNumber ? rollNumber.toString().trim() : '',
            name: name ? name.toString().trim() : '',
            fname: fname ? fname.toString().trim() : '',
            age: age ? parseInt(age) : null,
            classNumber: classNumber ? parseInt(classNumber) : null,
            gender: gender || null,
            address: address ? address.toString().trim() : null,
            phone: phone ? phone.toString().trim() : null
        };

        // Validate all fields
        const validationErrors = validateStudentData(formData);
        
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: validationErrors.join(', ')
            });
        }
        
        try {
            // Check if class exists
            const [classExists] = await db.promise().query(
                'SELECT * FROM classes WHERE class_number = ?',
                [formData.classNumber]
            );
            
            if (classExists.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Class does not exist'
                });
            }
            
            // Check if roll number already exists
            const [existingRoll] = await db.promise().query(
                'SELECT * FROM students WHERE roll_number = ?',
                [formData.rollNumber]
            );
            
            if (existingRoll.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Roll number already exists'
                });
            }
            
            const [result] = await db.promise().query(
                `INSERT INTO students 
                (roll_number, name, fname, age, class_number, gender, address, phone) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    formData.rollNumber, 
                    formData.name, 
                    formData.fname, 
                    formData.age, 
                    formData.classNumber, 
                    formData.gender, 
                    formData.address, 
                    formData.phone
                ]
            );
            
            // Get the newly created student with class info
            const [newStudent] = await db.promise().query(`
                SELECT 
                    s.*, 
                    c.class_name
                FROM students s
                LEFT JOIN classes c ON s.class_number = c.class_number
                WHERE s.student_id = ?
            `, [result.insertId]);
            
            res.json({ 
                success: true, 
                studentId: result.insertId,
                student: newStudent[0],
                message: 'Student added successfully'
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to add student to database: ' + error.message 
            });
        }
    });

    // PUT - Update student
    router.put('/:id', async (req, res) => {
        const studentId = req.params.id;
        const { rollNumber, name, fname, age, classNumber, gender, address, phone } = req.body;
        
        const formData = {
            rollNumber: rollNumber ? rollNumber.toString().trim() : '',
            name: name ? name.toString().trim() : '',
            fname: fname ? fname.toString().trim() : '',
            age: age ? parseInt(age) : null,
            classNumber: classNumber ? parseInt(classNumber) : null,
            gender: gender || null,
            address: address ? address.toString().trim() : null,
            phone: phone ? phone.toString().trim() : null
        };

        // Validate all fields
        const validationErrors = validateStudentData(formData, true);
        
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                error: validationErrors.join(', ')
            });
        }
        
        try {
            const [existingStudent] = await db.promise().query(
                'SELECT * FROM students WHERE student_id = ?',
                [studentId]
            );
            
            if (existingStudent.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Student not found'
                });
            }
            
            // Check if class exists
            const [classExists] = await db.promise().query(
                'SELECT * FROM classes WHERE class_number = ?',
                [formData.classNumber]
            );
            
            if (classExists.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Class does not exist'
                });
            }
            
            // Check if roll number already exists (excluding current student)
            const [existingRoll] = await db.promise().query(
                'SELECT * FROM students WHERE roll_number = ? AND student_id != ?',
                [formData.rollNumber, studentId]
            );
            
            if (existingRoll.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Roll number already exists'
                });
            }
            
            const [result] = await db.promise().query(
                `UPDATE students SET 
                roll_number = ?, name = ?, fname = ?, age = ?, class_number = ?, 
                gender = ?, address = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
                WHERE student_id = ?`,
                [
                    formData.rollNumber, 
                    formData.name, 
                    formData.fname, 
                    formData.age, 
                    formData.classNumber, 
                    formData.gender, 
                    formData.address, 
                    formData.phone, 
                    studentId
                ]
            );
            
            // Get updated student with class info
            const [updatedStudent] = await db.promise().query(`
                SELECT 
                    s.*, 
                    c.class_name
                FROM students s
                LEFT JOIN classes c ON s.class_number = c.class_number
                WHERE s.student_id = ?
            `, [studentId]);
            
            res.json({ 
                success: true,
                student: updatedStudent[0],
                message: 'Student updated successfully'
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to update student' 
            });
        }
    });

    // DELETE - Delete student
// DELETE - Delete student (SIMPLE VERSION)
router.delete('/:id', async (req, res) => {
    const studentId = req.params.id;
    
    try {
        const [existingStudent] = await db.promise().query(
            'SELECT * FROM students WHERE student_id = ?',
            [studentId]
        );
        
        if (existingStudent.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }
        
        // Simple direct delete - no transaction needed
        const [result] = await db.promise().query(
            'DELETE FROM students WHERE student_id = ?',
            [studentId]
        );
        
        res.json({ 
            success: true,
            message: 'Student deleted successfully'
        });
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete student: ' + error.message 
        });
    }
});

    // GET - Search students
    router.get('/search/:query', async (req, res) => {
        const searchQuery = `%${req.params.query}%`;
        
        try {
            const [students] = await db.promise().query(`
                SELECT 
                    s.*, 
                    c.class_name
                FROM students s
                LEFT JOIN classes c ON s.class_number = c.class_number
                WHERE s.name LIKE ? OR s.roll_number LIKE ? OR s.fname LIKE ?
                ORDER BY s.name
            `, [searchQuery, searchQuery, searchQuery]);
            
            res.json({
                success: true,
                students: students,
                count: students.length
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to search students' 
            });
        }
    });

    // GET - Get students statistics
    router.get('/stats/summary', async (req, res) => {
        try {
            const [totalCount] = await db.promise().query('SELECT COUNT(*) as total FROM students');
            const [genderStats] = await db.promise().query(`
                SELECT 
                    gender,
                    COUNT(*) as count
                FROM students 
                WHERE gender IS NOT NULL
                GROUP BY gender
            `);
            const [classStats] = await db.promise().query(`
                SELECT 
                    c.class_name,
                    c.class_number,
                    COUNT(s.student_id) as student_count
                FROM classes c
                LEFT JOIN students s ON c.class_number = s.class_number
                GROUP BY c.class_id
                ORDER BY c.class_number
            `);
            const [ageStats] = await db.promise().query(`
                SELECT 
                    AVG(age) as average_age,
                    MIN(age) as min_age,
                    MAX(age) as max_age
                FROM students 
                WHERE age IS NOT NULL
            `);
            
            res.json({
                success: true,
                stats: {
                    total: totalCount[0].total,
                    gender: genderStats,
                    classes: classStats,
                    age: ageStats[0]
                }
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch student statistics' 
            });
        }
    });

    return router;
};