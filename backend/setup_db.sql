-- ════════════════════════════════════════════════════════════════════════════
--  setup_db.sql  –  NL2SQL MySQL Database Setup
--  Run this file ONCE in MySQL to create the database and sample data.
--
--  How to run:
--    mysql -u root -p < setup_db.sql
--  Or paste into MySQL Workbench / DBeaver / phpMyAdmin.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Create database (skip if it already exists)
CREATE DATABASE IF NOT EXISTS nl2sql_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nl2sql_db;

-- ── Drop tables (if re-running this script) ──────────────────────────────────
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS departments;

-- ════════════════════════════════════════════════════════════════════════════
--  TABLE DEFINITIONS
-- ════════════════════════════════════════════════════════════════════════════

-- Departments (referenced by employees)
CREATE TABLE departments (
    id          INT           AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)  NOT NULL,
    budget      DECIMAL(12,2) DEFAULT 0,
    location    VARCHAR(100)
);

-- Customers
CREATE TABLE customers (
    id          INT           AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150)  NOT NULL,
    email       VARCHAR(200)  UNIQUE NOT NULL,
    city        VARCHAR(100),
    age         INT,
    joined_date DATE
);

-- Products
CREATE TABLE products (
    id          INT           AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200)  NOT NULL,
    category    VARCHAR(100),
    price       DECIMAL(10,2) NOT NULL,
    stock       INT           DEFAULT 0
);

-- Orders
CREATE TABLE orders (
    id          INT           AUTO_INCREMENT PRIMARY KEY,
    customer_id INT           NOT NULL,
    order_date  DATE          NOT NULL,
    total       DECIMAL(10,2),
    status      ENUM('pending','shipped','delivered','cancelled') DEFAULT 'pending',
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- Order line items
CREATE TABLE order_items (
    id          INT           AUTO_INCREMENT PRIMARY KEY,
    order_id    INT           NOT NULL,
    product_id  INT           NOT NULL,
    quantity    INT           NOT NULL,
    unit_price  DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Employees
CREATE TABLE employees (
    id            INT           AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(150)  NOT NULL,
    department_id INT,
    salary        DECIMAL(10,2),
    hire_date     DATE,
    is_active     BOOLEAN       DEFAULT TRUE,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- ════════════════════════════════════════════════════════════════════════════
--  SAMPLE DATA
-- ════════════════════════════════════════════════════════════════════════════

-- Departments
INSERT INTO departments (name, budget, location) VALUES
    ('Engineering',  5000000.00, 'Bangalore'),
    ('Marketing',    1500000.00, 'Mumbai'),
    ('HR',            800000.00, 'Delhi'),
    ('Finance',      2000000.00, 'Mumbai'),
    ('Product',      3000000.00, 'Bangalore');

-- Customers
INSERT INTO customers (name, email, city, age, joined_date) VALUES
    ('Alice Johnson',  'alice@email.com',  'Mumbai',    28, '2022-01-15'),
    ('Bob Smith',      'bob@email.com',    'Delhi',     35, '2021-06-10'),
    ('Carol White',    'carol@email.com',  'Bangalore', 24, '2023-03-22'),
    ('David Lee',      'david@email.com',  'Chennai',   42, '2020-11-05'),
    ('Eva Brown',      'eva@email.com',    'Pune',      31, '2022-08-30'),
    ('Frank Miller',   'frank@email.com',  'Mumbai',    27, '2023-01-12'),
    ('Grace Wilson',   'grace@email.com',  'Hyderabad', 38, '2021-04-18'),
    ('Henry Taylor',   'henry@email.com',  'Delhi',     45, '2020-07-25'),
    ('Irene Kumar',    'irene@email.com',  'Bangalore', 29, '2022-12-01'),
    ('James Patel',    'james@email.com',  'Mumbai',    33, '2021-09-14');

-- Products
INSERT INTO products (name, category, price, stock) VALUES
    ('Pizza Margherita',  'Food',        299.00,  50),
    ('Burger Deluxe',     'Food',        199.00,  80),
    ('Pasta Arabiata',    'Food',        249.00,  40),
    ('Mango Juice',       'Beverages',    89.00, 100),
    ('Cold Coffee',       'Beverages',   129.00,  75),
    ('Laptop Stand',      'Electronics', 599.00,  30),
    ('Wireless Mouse',    'Electronics', 799.00,  25),
    ('Mechanical Keyboard','Electronics',1299.00, 15),
    ('Notebook (A4)',     'Stationery',   49.00, 200),
    ('Pen Set (10pc)',    'Stationery',   29.00, 300),
    ('USB-C Hub',         'Electronics', 999.00,  20),
    ('Water Bottle',      'Lifestyle',   349.00,  60);

-- Orders
INSERT INTO orders (customer_id, order_date, total, status) VALUES
    (1,  '2024-01-10',  598.00, 'delivered'),
    (2,  '2024-01-15',  199.00, 'delivered'),
    (3,  '2024-02-01', 1398.00, 'shipped'),
    (4,  '2024-02-14',  299.00, 'delivered'),
    (5,  '2024-03-05',  848.00, 'pending'),
    (1,  '2024-03-10',  249.00, 'delivered'),
    (6,  '2024-03-20',  799.00, 'shipped'),
    (7,  '2024-04-01',  628.00, 'pending'),
    (2,  '2024-04-10',  398.00, 'delivered'),
    (8,  '2024-04-15',   89.00, 'cancelled'),
    (9,  '2024-05-01', 1299.00, 'delivered'),
    (10, '2024-05-20',  349.00, 'pending'),
    (3,  '2024-06-05',  999.00, 'shipped'),
    (5,  '2024-06-18',  129.00, 'delivered');

-- Order Items
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
    (1,  1, 2,  299.00),
    (2,  2, 1,  199.00),
    (3,  6, 2,  599.00),
    (3,  7, 1,  799.00),
    (4,  1, 1,  299.00),
    (5,  7, 1,  799.00),
    (5,  4, 1,   89.00),
    (6,  3, 1,  249.00),
    (7,  6, 1,  599.00),
    (7,  5, 1,  129.00),
    (8,  4, 1,   89.00),
    (9,  8, 1, 1299.00),
    (10, 12, 1,  349.00),
    (11,  8, 1, 1299.00),
    (12,  5, 1,  129.00),
    (13, 11, 1,  999.00),
    (14,  5, 1,  129.00);

-- Employees
INSERT INTO employees (name, department_id, salary, hire_date, is_active) VALUES
    ('Ravi Kumar',    1, 85000.00, '2020-06-01', TRUE),
    ('Priya Sharma',  2, 72000.00, '2019-03-15', TRUE),
    ('Amit Patel',    1, 92000.00, '2018-08-20', TRUE),
    ('Sneha Reddy',   3, 65000.00, '2021-01-10', TRUE),
    ('Karan Mehta',   1, 88000.00, '2022-05-01', TRUE),
    ('Nisha Gupta',   4, 78000.00, '2020-11-30', TRUE),
    ('Vikram Singh',  2, 69000.00, '2023-02-14', TRUE),
    ('Anjali Desai',  5, 95000.00, '2019-07-22', TRUE),
    ('Rohit Verma',   1, 81000.00, '2021-09-05', FALSE),
    ('Divya Nair',    3, 67000.00, '2022-03-18', TRUE),
    ('Suresh Iyer',   4, 82000.00, '2020-01-15', TRUE),
    ('Meera Joshi',   5, 90000.00, '2018-12-01', TRUE);

-- ════════════════════════════════════════════════════════════════════════════
--  Verify: quickly check row counts
-- ════════════════════════════════════════════════════════════════════════════
SELECT 'departments' AS tbl, COUNT(*) AS rows FROM departments
UNION ALL SELECT 'customers',  COUNT(*) FROM customers
UNION ALL SELECT 'products',   COUNT(*) FROM products
UNION ALL SELECT 'orders',     COUNT(*) FROM orders
UNION ALL SELECT 'order_items',COUNT(*) FROM order_items
UNION ALL SELECT 'employees',  COUNT(*) FROM employees;
