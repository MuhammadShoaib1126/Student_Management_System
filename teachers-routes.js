// teachers-routes.js
const express = require('express');

const teachersRoutes = (db) => {
    const router = express.Router();

    // GET - Get all teachers
    router.get('/', async (req, res) => {
        try {
            const [teachers] = await db.promise().query('SELECT * FROM teachers ORDER BY name');
            
            res.json({
                success: true,
                teachers: teachers
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch teachers' 
            });
        }
    });

    // GET - Get teacher by ID
    router.get('/:id', async (req, res) => {
        const teacherId = req.params.id;
        
        try {
            const [teachers] = await db.promise().query(
                'SELECT * FROM teachers WHERE teacher_id = ?',
                [teacherId]
            );
            
            if (teachers.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Teacher not found'
                });
            }
            
            res.json({
                success: true,
                teacher: teachers[0]
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch teacher' 
            });
        }
    });

    // POST - Create new teacher
    router.post('/', async (req, res) => {
        const { name, email, phone, qualification, age, gender, hire_date } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Teacher name is required'
            });
        }
        
        try {
            // Check if email already exists
            if (email) {
                const [existingEmail] = await db.promise().query(
                    'SELECT * FROM teachers WHERE email = ?',
                    [email]
                );
                
                if (existingEmail.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Email already exists'
                    });
                }
            }
            
            const [result] = await db.promise().query(
                'INSERT INTO teachers (name, email, phone, qualification, age, gender, hire_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [name, email, phone, qualification, age, gender, hire_date]
            );
            
            res.json({ 
                success: true, 
                teacherId: result.insertId,
                message: 'Teacher added successfully!'
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to add teacher to database' 
            });
        }
    });

    // PUT - Update teacher
    router.put('/:id', async (req, res) => {
        const teacherId = req.params.id;
        const { name, email, phone, qualification, age, gender, hire_date } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Teacher name is required'
            });
        }
        
        try {
            const [existingTeacher] = await db.promise().query(
                'SELECT * FROM teachers WHERE teacher_id = ?',
                [teacherId]
            );
            
            if (existingTeacher.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Teacher not found'
                });
            }
            
            // Check if email already exists (excluding current teacher)
            if (email) {
                const [existingEmail] = await db.promise().query(
                    'SELECT * FROM teachers WHERE email = ? AND teacher_id != ?',
                    [email, teacherId]
                );
                
                if (existingEmail.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Email already exists'
                    });
                }
            }
            
            const [result] = await db.promise().query(
                'UPDATE teachers SET name = ?, email = ?, phone = ?, qualification = ?, age = ?, gender = ?, hire_date = ? WHERE teacher_id = ?',
                [name, email, phone, qualification, age, gender, hire_date, teacherId]
            );
            
            res.json({ 
                success: true,
                message: 'Teacher updated successfully'
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to update teacher' 
            });
        }
    });

    // DELETE - Delete teacher
    router.delete('/:id', async (req, res) => {
        const teacherId = req.params.id;
        
        try {
            const [existingTeacher] = await db.promise().query(
                'SELECT * FROM teachers WHERE teacher_id = ?',
                [teacherId]
            );
            
            if (existingTeacher.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Teacher not found'
                });
            }
            
            // Check if teacher has assignments
            const [assignments] = await db.promise().query(
                'SELECT * FROM teacher_assignments WHERE teacher_id = ?',
                [teacherId]
            );
            
            if (assignments.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete teacher with existing assignments. Please remove assignments first.'
                });
            }
            
            const [result] = await db.promise().query(
                'DELETE FROM teachers WHERE teacher_id = ?',
                [teacherId]
            );
            
            res.json({ 
                success: true,
                message: 'Teacher deleted successfully'
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to delete teacher' 
            });
        }
    });

    return router;
};

module.exports = teachersRoutes;