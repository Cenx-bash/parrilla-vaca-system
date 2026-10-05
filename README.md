# Parrilla Vaca Table Reservation and Customer Request Management System

A web based management system developed for **Parrilla Vaca Bar and Grill** in M Plaza, Naga City. The system is designed to help manage table reservations, customer information, customer requests, table availability, and basic business reports in one centralized platform.

## Features

* Customer Management

  * Add and manage customer information
  * View customer records

* Table Management

  * Manage restaurant tables
  * Monitor table availability
  * Track table status

* Table Reservations

  * Create and manage reservations
  * View reservation details
  * Monitor reservation status

* Customer Requests

  * Record customer requests
  * Manage and monitor request status

* Reports

  * View summarized business information
  * Monitor reservations and customer activity

* Authentication

  * User login
  * Backend authentication routes

## Technologies Used

### Frontend

* HTML
* CSS
* JavaScript

### Backend

* Node.js
* Express.js

### Database

* MySQL

## Project Structure

```text
parrilla-vaca-system/
├── backend
│   ├── controllers
│   │   ├── customerController.js
│   │   ├── reservationController.js
│   │   └── tableController.js
│   ├── database
│   │   ├── connection.js
│   │   └── tables.sql
│   ├── routes
│   │   ├── auth.js
│   │   ├── customers.js
│   │   ├── requests.js
│   │   ├── reservations.js
│   │   └── tables.js
│   └── server.js
├── frontend
│   ├── css
│   │   └── style.css
│   ├── customers.html
│   ├── dashboard.html
│   ├── index.html
│   ├── login.html
│   ├── reports.html
│   ├── requests.html
│   ├── reservations.html
│   └── tables.html
└── package.json
```

## Folder Description

### `backend/`

Contains the server side application and database related files.

### `backend/controllers/`

Contains the logic for handling system operations.

* `customerController.js` handles customer related operations.
* `reservationController.js` handles reservation related operations.
* `tableController.js` handles table related operations.

### `backend/database/`

Contains the database connection and SQL database structure.

* `connection.js` manages the MySQL database connection.
* `tables.sql` contains the SQL commands for creating the database tables.

### `backend/routes/`

Contains the API routes used by the frontend.

* `auth.js` handles authentication.
* `customers.js` handles customer related requests.
* `requests.js` handles customer requests.
* `reservations.js` handles reservations.
* `tables.js` handles table related requests.

### `backend/server.js`

The main entry point of the backend server.

### `frontend/`

Contains the user interface of the system.

* `index.html` contains the main landing page.
* `login.html` contains the login page.
* `dashboard.html` contains the system dashboard.
* `customers.html` contains customer management.
* `reservations.html` contains reservation management.
* `tables.html` contains table management.
* `requests.html` contains customer request management.
* `reports.html` contains system reports.

### `frontend/css/`

Contains the stylesheets used by the frontend.

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd parrilla-vaca-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure the Database

Create a MySQL database for the project.

Import the database structure from:

```text
backend/database/tables.sql
```

Update the database connection settings in:

```text
backend/database/connection.js
```

Make sure the database credentials match your local MySQL configuration.

### 4. Start the Backend Server

```bash
node backend/server.js
```

The backend server will run using the port configured in the project.

### 5. Open the Frontend

Open:

```text
frontend/index.html
```

using a browser or a local development server.

## Development

The project separates the frontend and backend into different directories.

The frontend provides the user interface, while the backend handles API requests, business logic, authentication, and database operations.

```text
Frontend
   │
   │ HTTP Requests
   ▼
Backend Server
   │
   ├── Routes
   │
   ├── Controllers
   │
   ▼
MySQL Database
```

## Purpose

The system aims to improve the management of restaurant reservations and customer requests at Parrilla Vaca Bar and Grill. It provides a centralized way to organize customer information, table availability, reservations, and requests while helping staff monitor restaurant operations more efficiently.

## Project Status

**In Development**

The system is currently being developed and tested. Additional features, improvements, and bug fixes may be added as development continues.

## Developers

Developed as a student project for **Ateneo de Naga University**.

**Project:** Parrilla Vaca Table Reservation and Customer Request Management System

**Restaurant:** Parrilla Vaca Bar and Grill, M Plaza, Naga City
