# Health Care

A scalable backend API for managing healthcare services including patients, doctors, AI doctors suggestion, appointments, authentication, and medical data.

Built with Node.js, Express, Prisma, and PostgreSQL.

---

## 📌 Table of Contents

- Project Overview
- Tech Stack
- Features
- System Architecture
- Folder Structure
- Environment Variables
- Installation & Setup
- Running the Project
- API Documentation
- Authentication
- Database Schema Overview
- Error Handling
- Rate Limiting
- Security Practices
- Deployment
- Future Improvements

---

# 1. Project Overview

Health Care API is a backend system designed to manage healthcare services such as:

- Patient registration
- Schedule management
- Doctor management
- AI doctor suggestion
- Doctor schedule management
- Appointment booking
- Medical records
- Authentication & authorization
- Admin management

The system follows a scalable modular architecture suitable for production SaaS applications.

---

# 2. Tech Stack

- **Node.js**
- **Express.js**
- **TypeScript**
- **PostgreSQL**
- **Prisma ORM**
- **Redis** (for rate limiting / caching)
- **JWT Authentication**
- **Zod / Validation**
- **Cloudinary**

---

# 3. Features

### Authentication

- User Registration
- Login
- JWT Access Token
- Refresh Token
- Role-based access control

### Patient Management

- Create patient profile
- Update health data
- View medical history

### Doctor Management

- Doctor profiles
- Specialization
- Availability

### Appointment System

- Book appointment
- Appointment status
- Appointment history

### Admin Features

- Manage users
- Manage doctors
- Manage appointments

---

# 4. System Architecture

The project follows a **Modular Layered Architecture**

---

# 5. Environment Variables

Create a `.env` file:

```env
NODE_ENV=
PORT=
DATABASE_URL=

BCRYPT_SALT =

# TOKEN
JWT_ACCESS_TOKEN_SECRET =
JWT_ACCESS_TOKEN_EXPIRESIN =
JWT_REFRESH_TOKEN_SECRET =
JWT_REFRESH_TOKEN_EXPIRESIN =

# OPENAI
OPEN_AI_API_KEY =

#STRIPE
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_SUCCESS_URL=
STRIPE_CANCEL_URL=


# CLOUDINAY
CLOUD_NAME =
CLOUD_API_KEY =
CLOUD_API_SECRET =
```

# 6. Installation & Setup

Clone the repository

```bash
git clone https://github.com/asrafulsgit/health-care-server.git
```

Install dependencies

```bash
pnpm install
```

Generate Prisma Client

```bash
npx prisma generate
```

Run migrations

```bash
npx prisma migrate dev
```

Running the project

```bash
pnpm  dev
```
