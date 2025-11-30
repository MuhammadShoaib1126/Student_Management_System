// subjects-routes.js
const express = require('express');
const router = express.Router();

// This function will receive the 'db' from main file
module.exports = (db) => {
    
    // GET all subjects
    router.get('/', async (req, res) => {
        try {
            const [subjects] = await db.promise().query(`
                SELECT 
                    s.*, 
                    c.class_name,
                    COUNT(st.student_id) as student_count
                FROM subjects s
                JOIN classes c ON s.class_number = c.class_number
                LEFT JOIN students st ON s.class_number = st.class_number
                GROUP BY s.subject_id
                ORDER BY s.class_number, s.subject_name
            `);
            
            res.json({
                success: true,
                subjects: subjects
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch subjects' 
            });
        }
    });

    // GET - Get single subject by ID
    router.get('/:id', async (req, res) => {
        const subjectId = req.params.id;
        
        try {
            const [subjects] = await db.promise().query(`
                SELECT 
                    s.*, 
                    c.class_name
                FROM subjects s
                JOIN classes c ON s.class_number = c.class_number
                WHERE s.subject_id = ?
            `, [subjectId]);
            
            if (subjects.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Subject not found'
                });
            }
            
            res.json({
                success: true,
                subject: subjects[0]
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch subject' 
            });
        }
    });

    // GET - Get subjects by class number
    router.get('/class/:classNumber', async (req, res) => {
        const classNumber = req.params.classNumber;
        
        try {
            const [subjects] = await db.promise().query(`
                SELECT 
                    s.*, 
                    c.class_name,
                    COUNT(st.student_id) as student_count
                FROM subjects s
                JOIN classes c ON s.class_number = c.class_number
                LEFT JOIN students st ON s.class_number = st.class_number
                WHERE s.class_number = ?
                GROUP BY s.subject_id
                ORDER BY s.subject_name
            `, [classNumber]);
            
            res.json({
                success: true,
                subjects: subjects
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch subjects for class' 
            });
        }
    });

    // POST - Create new subject
    router.post('/', async (req, res) => {
        const { subjectName, classNumber, maxMarks } = req.body;
        
        // Required field validation
        if (!subjectName || !classNumber) {
            return res.status(400).json({
                success: false,
                error: 'Subject name and class number are required'
            });
        }
        
        // Subject name validation (matching frontend validation)
        const namechecker = /^[a-zA-Z0-9\s]+$/;
        const onlyDigits = /^\d+$/;
        
        if (!namechecker.test(subjectName)) {
            return res.status(400).json({
                success: false,
                error: 'Subject name can only contain letters, numbers and spaces'
            });
        }
        
        if (onlyDigits.test(subjectName)) {
            return res.status(400).json({
                success: false,
                error: 'Subject name cannot be only numbers'
            });
        }
        
        // Max marks validation
        if (maxMarks && maxMarks < 1) {
            return res.status(400).json({
                success: false,
                error: 'Maximum marks must be at least 1'
            });
        }
        
        try {
            // Check if class exists
            const [classExists] = await db.promise().query(
                'SELECT * FROM classes WHERE class_number = ?',
                [classNumber]
            );
            
            if (classExists.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Class does not exist'
                });
            }
            
            // Check if subject already exists in this class
            const [existing] = await db.promise().query(
                'SELECT * FROM subjects WHERE subject_name = ? AND class_number = ?',
                [subjectName, classNumber]
            );
            
            if (existing.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Subject already exists in this class'
                });
            }
            
            const [result] = await db.promise().query(
                'INSERT INTO subjects (subject_name, class_number, max_marks) VALUES (?, ?, ?)',
                [subjectName, classNumber, maxMarks || 100]
            );
            
            // Get the newly created subject with class info
            const [newSubject] = await db.promise().query(`
                SELECT 
                    s.*, 
                    c.class_name
                FROM subjects s
                JOIN classes c ON s.class_number = c.class_number
                WHERE s.subject_id = ?
            `, [result.insertId]);
            
            res.json({ 
                success: true, 
                subjectId: result.insertId,
                subject: newSubject[0],
                message: 'Subject added successfully'
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to add subject to database: ' + error.message 
            });
        }
    });

    // PUT - Update subject
    router.put('/:id', async (req, res) => {
        const subjectId = req.params.id;
        const { subjectName, maxMarks } = req.body;
        
        if (!subjectName) {
            return res.status(400).json({
                success: false,
                error: 'Subject name is required'
            });
        }
        
        // Subject name validation (matching frontend validation)
        const namechecker = /^[a-zA-Z0-9\s]+$/;
        const onlyDigits = /^\d+$/;
        
        if (!namechecker.test(subjectName)) {
            return res.status(400).json({
                success: false,
                error: 'Subject name can only contain letters, numbers and spaces'
            });
        }
        
        if (onlyDigits.test(subjectName)) {
            return res.status(400).json({
                success: false,
                error: 'Subject name cannot be only numbers'
            });
        }
        
        // Max marks validation
        if (maxMarks && maxMarks < 1) {
            return res.status(400).json({
                success: false,
                error: 'Maximum marks must be at least 1'
            });
        }
        
        try {
            const [existingSubject] = await db.promise().query(
                'SELECT * FROM subjects WHERE subject_id = ?',
                [subjectId]
            );
            
            if (existingSubject.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Subject not found'
                });
            }
            
            // Check if subject name already exists in the same class (excluding current subject)
            const [duplicate] = await db.promise().query(
                'SELECT * FROM subjects WHERE subject_name = ? AND class_number = ? AND subject_id != ?',
                [subjectName, existingSubject[0].class_number, subjectId]
            );
            
            if (duplicate.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Subject name already exists in this class'
                });
            }
            
            const [result] = await db.promise().query(
                'UPDATE subjects SET subject_name = ?, max_marks = ? WHERE subject_id = ?',
                [subjectName, maxMarks || 100, subjectId]
            );
            
            // Get updated subject with class info
            const [updatedSubject] = await db.promise().query(`
                SELECT 
                    s.*, 
                    c.class_name
                FROM subjects s
                JOIN classes c ON s.class_number = c.class_number
                WHERE s.subject_id = ?
            `, [subjectId]);
            
            res.json({ 
                success: true,
                subject: updatedSubject[0],
                message: 'Subject updated successfully'
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to update subject' 
            });
        }
    });

    // DELETE - Delete subject
    router.delete('/:id', async (req, res) => {
        const subjectId = req.params.id;
        
        try {
            const [existingSubject] = await db.promise().query(
                'SELECT * FROM subjects WHERE subject_id = ?',
                [subjectId]
            );
            
            if (existingSubject.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Subject not found'
                });
            }
            
            // Start transaction to handle related data
            const connection = await db.promise().getConnection();
            await connection.beginTransaction();
            
            try {
                // Delete related teacher assignments
                await connection.query('DELETE FROM teacher_assignments WHERE subject_id = ?', [subjectId]);
                
                // Delete related exam records
                await connection.query('DELETE FROM exam_records WHERE subject_id = ?', [subjectId]);
                
                // Delete the subject
                await connection.query('DELETE FROM subjects WHERE subject_id = ?', [subjectId]);
                
                await connection.commit();
                connection.release();
                
                res.json({ 
                    success: true,
                    message: 'Subject deleted successfully'
                });
                
            } catch (transactionError) {
                await connection.rollback();
                connection.release();
                throw transactionError;
            }
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to delete subject' 
            });
        }
    });

    // GET - Search subjects
    router.get('/search/:query', async (req, res) => {
        const searchQuery = `%${req.params.query}%`;
        
        try {
            const [subjects] = await db.promise().query(`
                SELECT 
                    s.*, 
                    c.class_name,
                    COUNT(st.student_id) as student_count
                FROM subjects s
                JOIN classes c ON s.class_number = c.class_number
                LEFT JOIN students st ON s.class_number = st.class_number
                WHERE s.subject_name LIKE ? OR c.class_name LIKE ?
                GROUP BY s.subject_id
                ORDER BY s.subject_name
            `, [searchQuery, searchQuery]);
            
            res.json({
                success: true,
                subjects: subjects,
                count: subjects.length
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to search subjects' 
            });
        }
    });

    // GET - Get subjects statistics
    router.get('/stats/summary', async (req, res) => {
        try {
            const [totalCount] = await db.promise().query('SELECT COUNT(*) as total FROM subjects');
            const [classStats] = await db.promise().query(`
                SELECT 
                    c.class_name,
                    c.class_number,
                    COUNT(s.subject_id) as subject_count
                FROM classes c
                LEFT JOIN subjects s ON c.class_number = s.class_number
                GROUP BY c.class_id
                ORDER BY c.class_number
            `);
            const [marksStats] = await db.promise().query(`
                SELECT 
                    AVG(max_marks) as average_marks,
                    MIN(max_marks) as min_marks,
                    MAX(max_marks) as max_marks
                FROM subjects 
                WHERE max_marks IS NOT NULL
            `);
            
            res.json({
                success: true,
                stats: {
                    total: totalCount[0].total,
                    classes: classStats,
                    marks: marksStats[0]
                }
            });
            
        } catch (error) {
            console.error('Database error:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch subject statistics' 
            });
        }
    });

    return router;
};