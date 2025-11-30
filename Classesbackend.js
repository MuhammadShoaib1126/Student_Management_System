const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const subjectsRoutes = require('./subjects-routes');
const studentsRoutes = require('./students-routes');
const teachersRoutes = require('./teachers-routes');
const teacherAssignmentsRoutes = require('./teacher-assignments-routes');
const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Shoaib@1071',
    database: 'student_management',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL database');
        connection.release();
    }
});
app.use('/api/subjects', subjectsRoutes(db));
app.use('/api/students', studentsRoutes(db));
app.use('/api/teachers', teachersRoutes(db));
app.use('/api/teacher-assignments', teacherAssignmentsRoutes(db));
// POST - Create new class
app.post('/api/classes', async (req, res) => {
    const { className, classNumber } = req.body;
    
    if (!className || !classNumber) {
        return res.status(400).json({
            success: false,
            error: 'Class name and class number are required'
        });
    }
    
    try {
        const [existing] = await db.promise().query(
            'SELECT * FROM classes WHERE class_number = ?',
            [classNumber]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Class  already exists'
            });
        }
        
        const [result] = await db.promise().query(
            'INSERT INTO classes (class_name, class_number) VALUES (?, ?)',
            [className, classNumber]
        );
        
        res.json({ 
            success: true, 
            classId: result.insertId,
            message: 'Class Added Successfully!'
        });
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to add class to database' 
        });
    }
});

// GET - Get single class by ID
app.get('/api/classes/:id', async (req, res) => {
    const classId = req.params.id;
    
    try {
        const [classes] = await db.promise().query(
            'SELECT * FROM classes WHERE class_id = ?',
            [classId]
        );
        
        if (classes.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Class not found'
            });
        }
        
        res.json({
            success: true,
            class: classes[0]
        });
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch class' 
        });
    }
});

// GET - Get all classes
app.get('/api/classes', async (req, res) => {
    try {
        const [classes] = await db.promise().query(`
                      SELECT 
                c.*,
                COUNT(DISTINCT s.student_id) as student_count,
                COUNT(DISTINCT ta.teacher_id) as teacher_count,
                COUNT(DISTINCT sub.subject_id) as subject_count
            FROM classes c
            LEFT JOIN students s ON c.class_number = s.class_number
            LEFT JOIN teacher_assignments ta ON c.class_number = ta.class_number
            LEFT JOIN subjects sub ON c.class_number = sub.class_number
            GROUP BY c.class_id
            ORDER BY c.class_number
        `);
        
        res.json({
            success: true,
            classes: classes
        });
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch classes' 
        });
    }
});

// PUT - Update class
app.put('/api/classes/:id', async (req, res) => {
    const classId = req.params.id;
    const { className, classNumber } = req.body;
    
    if (!className || !classNumber) {
        return res.status(400).json({
            success: false,
            error: 'Class name and class number are required'
        });
    }
    
    try {
        const [existingClass] = await db.promise().query(
            'SELECT * FROM classes WHERE class_id = ?',
            [classId]
        );
        
        if (existingClass.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Class not found'
            });
        }
        
        const [duplicate] = await db.promise().query(
            'SELECT * FROM classes WHERE class_number = ? AND class_id != ?',
            [classNumber, classId]
        );
        
        if (duplicate.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Class  already exists'
            });
        }
        
        const [result] = await db.promise().query(
            'UPDATE classes SET class_name = ?, class_number = ? WHERE class_id = ?',
            [className, classNumber, classId]
        );
        
        res.json({ 
            success: true,
            message: 'Class updated successfully'
        });
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update class' 
        });
    }
});

// DELETE - Delete class
app.delete('/api/classes/:id', async (req, res) => {
    const classId = req.params.id;
    
    try {
        const [existingClass] = await db.promise().query(
            'SELECT * FROM classes WHERE class_id = ?',
            [classId]
        );
        
        if (existingClass.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Class not found'
            });
        }
        
        const [result] = await db.promise().query(
            'DELETE FROM classes WHERE class_id = ?',
            [classId]
        );
        
        res.json({ 
            success: true,
            message: 'Class deleted successfully'
        });
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete class' 
        });
    }
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});