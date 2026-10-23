import mysql from 'mysql2/promise';

async function init() {
  console.log('Connecting to MySQL 9.7...');
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'bhalaksha',
    multipleStatements: true
  });

  console.log('Creating databases...');
  await conn.query(`
    CREATE DATABASE IF NOT EXISTS my_database;
    CREATE DATABASE IF NOT EXISTS university;
    CREATE DATABASE IF NOT EXISTS ecommerce;
    CREATE DATABASE IF NOT EXISTS company;
  `);

  console.log('Switching to my_database...');
  await conn.changeUser({ database: 'my_database' });

  console.log('Creating tables in my_database...');
  await conn.query(`
    DROP TABLE IF EXISTS enrollments;
    DROP TABLE IF EXISTS faculty;
    DROP TABLE IF EXISTS courses;
    DROP TABLE IF EXISTS students;

    CREATE TABLE students (
      id INT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      department VARCHAR(50) NOT NULL,
      cgpa DECIMAL(3,2) NOT NULL,
      email VARCHAR(100) NOT NULL,
      year INT NOT NULL
    ) ENGINE=InnoDB;

    CREATE TABLE courses (
      course_id VARCHAR(20) PRIMARY KEY,
      course_name VARCHAR(100) NOT NULL,
      credits INT NOT NULL,
      department VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB;

    CREATE TABLE enrollments (
      enrollment_id INT PRIMARY KEY AUTO_INCREMENT,
      student_id INT NOT NULL,
      course_id VARCHAR(20) NOT NULL,
      semester VARCHAR(10) NOT NULL,
      grade VARCHAR(5) NOT NULL
    ) ENGINE=InnoDB;

    CREATE TABLE faculty (
      faculty_id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      department VARCHAR(50) NOT NULL,
      designation VARCHAR(50) NOT NULL,
      experience_years INT NOT NULL
    ) ENGINE=InnoDB;
  `);

  console.log('Populating courses and faculty...');
  await conn.query(`
    INSERT INTO courses (course_id, course_name, credits, department) VALUES
    ('CS101', 'Data Structures & Algorithms', 4, 'CSE'),
    ('CS202', 'Database Management Systems', 4, 'CSE'),
    ('CS303', 'Operating Systems', 4, 'CSE'),
    ('CS404', 'Computer Networks', 3, 'CSE'),
    ('IT201', 'Web Technologies', 3, 'IT'),
    ('IT302', 'Cloud Computing Architecture', 4, 'IT'),
    ('EC101', 'Digital Electronics', 4, 'ECE'),
    ('EC202', 'Microprocessors & Embedded Systems', 4, 'ECE'),
    ('EN101', 'Signals and Systems', 4, 'ENTC'),
    ('ME101', 'Thermodynamics & Heat Transfer', 4, 'ME');

    INSERT INTO faculty (name, department, designation, experience_years) VALUES
    ('Dr. Ramesh Kulkarni', 'CSE', 'Professor & HOD', 22),
    ('Dr. Sunita Deshmukh', 'CSE', 'Associate Professor', 14),
    ('Prof. Amit Joshi', 'IT', 'Assistant Professor', 8),
    ('Dr. Priya Patil', 'ECE', 'Professor', 18),
    ('Prof. Sachin Shinde', 'ENTC', 'Associate Professor', 12),
    ('Dr. Manoj Sharma', 'ME', 'Professor', 20);
  `);

  console.log('Generating 1,234 realistic student records...');
  const firstNames = [
    'Aarav', 'Ishita', 'Rohan', 'Sneha', 'Aditya', 'Priya', 'Karan', 'Neha', 'Vikram', 'Ananya',
    'Arjun', 'Tanvi', 'Siddharth', 'Pooja', 'Rahul', 'Anjali', 'Varun', 'Riya', 'Gaurav', 'Shreya',
    'Nikhil', 'Divya', 'Mayur', 'Meera', 'Abhishek', 'Swati', 'Harsh', 'Prachi', 'Alok', 'Deepa'
  ];
  const lastNames = [
    'Sharma', 'Verma', 'Patel', 'Kulkarni', 'Singh', 'Deshmukh', 'Mehta', 'Joshi', 'Gupta', 'Reddy',
    'Iyer', 'Nair', 'Chavan', 'Bhosale', 'Pawar', 'Mishra', 'Choudhary', 'Agrawal', 'Shah', 'Bhat'
  ];

  // Specific first 10 students matching Page 3 screenshot exactly
  const initialStudents = [
    { id: 1, name: 'Aarav Sharma', department: 'CSE', cgpa: 8.70, email: 'aarav58241@vit.edu', year: 3 },
    { id: 2, name: 'Ishita Verma', department: 'IT', cgpa: 9.10, email: 'ishita58242@vit.edu', year: 2 },
    { id: 3, name: 'Rohan Patel', department: 'CSE', cgpa: 8.30, email: 'rohan58243@vit.edu', year: 4 },
    { id: 4, name: 'Sneha Kulkarni', department: 'ENTC', cgpa: 8.90, email: 'sneha58244@vit.edu', year: 3 },
    { id: 5, name: 'Aditya Singh', department: 'CSE', cgpa: 7.80, email: 'aditya58245@vit.edu', year: 2 },
    { id: 6, name: 'Priya Deshmukh', department: 'IT', cgpa: 8.60, email: 'priya58246@vit.edu', year: 3 },
    { id: 7, name: 'Karan Mehta', department: 'CSE', cgpa: 9.20, email: 'karan58247@vit.edu', year: 4 },
    { id: 8, name: 'Neha Joshi', department: 'ECE', cgpa: 8.40, email: 'neha58248@vit.edu', year: 2 },
    { id: 9, name: 'Vikram Gupta', department: 'ME', cgpa: 7.90, email: 'vikram58249@vit.edu', year: 3 },
    { id: 10, name: 'Ananya Reddy', department: 'CSE', cgpa: 9.00, email: 'ananya58250@vit.edu', year: 3 }
  ];

  const students = [...initialStudents];
  const depts = [
    ...Array(515).fill('CSE'),
    ...Array(308).fill('IT'),
    ...Array(179).fill('ENTC'),
    ...Array(149).fill('ECE'),
    ...Array(73).fill('ME')
  ]; // Total 1,224 + 10 = 1,234!

  for (let i = 11; i <= 1234; i++) {
    const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
    const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
    const dept = depts[i - 11] || 'CSE';
    // Realistic GPA curve centered around 8.46
    const baseGpa = 7.1 + Math.random() * 2.1 + (dept === 'CSE' ? 0.2 : 0);
    const cgpa = Number(Math.min(9.85, Math.max(7.0, baseGpa)).toFixed(2));
    const year = Math.floor(Math.random() * 4) + 1;
    const email = `${fn.toLowerCase()}${58240 + i}@vit.edu`;

    students.push({
      id: i,
      name: `${fn} ${ln}`,
      department: dept,
      cgpa,
      email,
      year
    });
  }

  // Batch insert students
  console.log(`Inserting ${students.length} students in batches...`);
  const batchSize = 200;
  for (let i = 0; i < students.length; i += batchSize) {
    const batch = students.slice(i, i + batchSize);
    const values = batch.map(s => `(${s.id}, ${conn.escape(s.name)}, ${conn.escape(s.department)}, ${s.cgpa}, ${conn.escape(s.email)}, ${s.year})`).join(',');
    await conn.query(`INSERT INTO students (id, name, department, cgpa, email, year) VALUES ${values};`);
  }

  console.log('Creating secondary indexes on students...');
  await conn.query(`
    CREATE INDEX idx_department ON students(department);
    CREATE INDEX idx_cgpa ON students(cgpa);
    CREATE INDEX idx_name ON students(name);
    CREATE INDEX idx_department_cgpa ON students(department, cgpa);
    CREATE INDEX idx_email ON students(email);
  `);

  console.log('Setup in university, ecommerce, company schemas...');
  await conn.query(`
    USE university;
    CREATE TABLE IF NOT EXISTS departments (dept_id VARCHAR(10) PRIMARY KEY, dept_name VARCHAR(100));
    CREATE TABLE IF NOT EXISTS professors (prof_id INT PRIMARY KEY, name VARCHAR(100), dept_id VARCHAR(10));

    USE ecommerce;
    CREATE TABLE IF NOT EXISTS products (product_id INT PRIMARY KEY, title VARCHAR(100), price DECIMAL(10,2), category VARCHAR(50));
    CREATE TABLE IF NOT EXISTS orders (order_id INT PRIMARY KEY, customer_name VARCHAR(100), amount DECIMAL(10,2));

    USE company;
    CREATE TABLE IF NOT EXISTS employees (emp_id INT PRIMARY KEY, full_name VARCHAR(100), role VARCHAR(50), salary INT);
  `);

  console.log('Successfully initialized MySQL database schemas and records!');
  await conn.end();
}

init().catch(err => {
  console.error('Initialization error:', err);
  process.exit(1);
});
