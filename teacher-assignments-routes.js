// teacher-assignments-routes.js
const express = require('express');

const teacherAssignmentsRoutes = (db) => {
    const router = express.Router();

    // GET - Get all teacher assignments with details
    router.get('/', async (req, res) => {
        try {
            const [assignments] = await db.promise().query(`
                SELECT 
                    ta.*,
                    t.name as teacher_name,
                    s.subject_name,
                    c.class_name
                FROM teacher_assignments ta
                LEFT JOIN teachers t ON ta.teacher_id = t.teacher_id
                LEFT JOIN subjects s ON ta.subject_id = s.subject_id
                LEFT JOIN classes c ON ta.class_number = c.class_number
                ORDER BY ta.created_at DESC
            `);
            
            res.json({
                success: true,
                assignments: assignments
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch teacher assignments' 
            });
        }
    });

    // GET - Get assignment by ID
    router.get('/:id', async (req, res) => {
        const assignmentId = req.params.id;
        
        try {
            const [assignments] = await db.promise().query(
                'SELECT * FROM teacher_assignments WHERE assignment_id = ?',
                [assignmentId]
            );
            
            if (assignments.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Assignment not found'
                });
            }
            
            res.json({
                success: true,
                assignment: assignments[0]
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch assignment' 
            });
        }
    });

    // POST - Create new assignment
    router.post('/', async (req, res) => {
        const { teacher_id, class_number, subject_id } = req.body;
        
        if (!teacher_id || !class_number || !subject_id) {
            return res.status(400).json({
                success: false,
                error: 'Teacher ID, class number, and subject ID are required'
            });
        }
        
        try {
            // Check if assignment already exists
            const [existingAssignment] = await db.promise().query(
                'SELECT * FROM teacher_assignments WHERE teacher_id = ? AND class_number = ? AND subject_id = ?',
                [teacher_id, class_number, subject_id]
            );
            
            if (existingAssignment.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Teacher is already assigned to this subject in the specified class'
                });
            }
            
            const [result] = await db.promise().query(
                'INSERT INTO teacher_assignments (teacher_id, class_number, subject_id) VALUES (?, ?, ?)',
                [teacher_id, class_number, subject_id]
            );
            
            res.json({ 
                success: true, 
                assignmentId: result.insertId,
                message: 'Teacher assigned successfully!'
            });
            
        } catch (error) {
            console.error('Database error:', error);
            
            // Handle foreign key constraint errors
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid teacher, class, or subject ID'
                });
            }
            
            res.status(500).json({ 
                success: false, 
                error: 'Failed to create assignment' 
            });
        }
    });

    // PUT - Update assignment
    router.put('/:id', async (req, res) => {
        const assignmentId = req.params.id;
        const { teacher_id, class_number, subject_id } = req.body;
        
        if (!teacher_id || !class_number || !subject_id) {
            return res.status(400).json({
                success: false,
                error: 'Teacher ID, class number, and subject ID are required'
            });
        }
        
        try {
            const [existingAssignment] = await db.promise().query(
                'SELECT * FROM teacher_assignments WHERE assignment_id = ?',
                [assignmentId]
            );
            
            if (existingAssignment.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Assignment not found'
                });
            }
            
            // Check for duplicate assignment (excluding current one)
            const [duplicateAssignment] = await db.promise().query(
                'SELECT * FROM teacher_assignments WHERE teacher_id = ? AND class_number = ? AND subject_id = ? AND assignment_id != ?',
                [teacher_id, class_number, subject_id, assignmentId]
            );
            
            if (duplicateAssignment.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Teacher is already assigned to this subject in the specified class'
                });
            }
            
            const [result] = await db.promise().query(
                'UPDATE teacher_assignments SET teacher_id = ?, class_number = ?, subject_id = ? WHERE assignment_id = ?',
                [teacher_id, class_number, subject_id, assignmentId]
            );
            
            res.json({ 
                success: true,
                message: 'Assignment updated successfully'
            });
            
        } catch (error) {
            console.error('Database error:', error);
            
            // Handle foreign key constraint errors
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid teacher, class, or subject ID'
                });
            }
            
            res.status(500).json({ 
                success: false, 
                error: 'Failed to update assignment' 
            });
        }
    });

    // DELETE - Delete assignment
    router.delete('/:id', async (req, res) => {
        const assignmentId = req.params.id;
        
        try {
            const [existingAssignment] = await db.promise().query(
                'SELECT * FROM teacher_assignments WHERE assignment_id = ?',
                [assignmentId]
            );
            
            if (existingAssignment.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Assignment not found'
                });
            }
            
            const [result] = await db.promise().query(
                'DELETE FROM teacher_assignments WHERE assignment_id = ?',
                [assignmentId]
            );
            
            res.json({ 
                success: true,
                message: 'Assignment deleted successfully'
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to delete assignment' 
            });
        }
    });

    return router;
};

module.exports = teacherAssignmentsRoutes;