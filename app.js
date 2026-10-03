// Activity 32: load settings from .env (run: npm install dotenv)
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');

const app = express();

// Activity 7 + 32: database connection using environment variables
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'student_management'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
    return;
  }
  console.log('Connected to MySQL');
});

// Activity 8: Configure Express
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ---------- Validation helper (Activity 34 tests) ----------
function validateStudent(body) {
  const errors = [];
  const student_id = (body.student_id || '').trim();
  const first_name = (body.first_name || '').trim();
  const last_name = (body.last_name || '').trim();
  const course = (body.course || '').trim();
  const email = (body.email || '').trim();
  const year_level = parseInt(body.year_level, 10);

  if (!student_id) errors.push('Student ID is required.');
  if (!first_name) errors.push('First name is required.');
  if (!last_name) errors.push('Last name is required.');
  if (!course) errors.push('Course is required.');
  if (!Number.isInteger(year_level) || year_level < 1 || year_level > 5) {
    errors.push('Year level must be a number from 1 to 5.');
  }
  if (!email) {
    errors.push('Email is required.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Email is not valid.');
  }

  return {
    errors,
    values: { student_id, first_name, last_name, course, year_level: body.year_level || '', email }
  };
}

// Activity 9: Student list route
app.get('/', (req, res) => {
  db.query('SELECT * FROM students ORDER BY id DESC', (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }

    res.render('index', {
      students: results,
      keyword: '',
      message: req.query.message || ''
    });
  });
});

// Activity 22: Student search (kept above any /students/:id route)
app.get('/students/search', (req, res) => {
  const keyword = (req.query.keyword || '').trim();

  const sql = `
    SELECT * FROM students
    WHERE student_id LIKE ?
    OR first_name LIKE ?
    OR last_name LIKE ?
    OR course LIKE ?
    ORDER BY id DESC
  `;

  const searchValue = `%${keyword}%`;

  db.query(
    sql,
    [searchValue, searchValue, searchValue, searchValue],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Search error');
      }

      res.render('index', {
        students: results,
        keyword,
        message: ''
      });
    }
  );
});

// Activity 12: Show the Add Student form
app.get('/students/add', (req, res) => {
  res.render('add', { errors: [], values: {} });
});

// Activity 13 + validation: Process the form
app.post('/students/add', (req, res) => {
  const { errors, values } = validateStudent(req.body);

  if (errors.length > 0) {
    return res.status(400).render('add', { errors, values });
  }

  const sql = `
    INSERT INTO students
    (student_id, first_name, last_name, course, year_level, email)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const params = [
    values.student_id,
    values.first_name,
    values.last_name,
    values.course,
    parseInt(values.year_level, 10),
    values.email
  ];

  db.query(sql, params, (err) => {
    if (err) {
      // student_id is UNIQUE in the table
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).render('add', {
          errors: ['That Student ID already exists.'],
          values
        });
      }
      console.error(err);
      return res.status(500).send('Unable to save student');
    }

    res.redirect('/?message=' + encodeURIComponent('Student added.'));
  });
});

// Activity 30: Delete Student (POST is safer than GET for deleting)
app.post('/students/delete/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (!Number.isInteger(id)) {
    return res.status(400).send('Invalid student ID');
  }

  // WHERE id = ? makes sure only this one record is deleted
  db.query('DELETE FROM students WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Unable to delete student');
    }

    const message = result.affectedRows === 0
      ? 'Student not found.'
      : 'Student deleted.';

    res.redirect('/?message=' + encodeURIComponent(message));
  });
});

// Activity 11: Start the server
app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});
