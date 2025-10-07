# RIPARO Frontend

<div align="center">

![RIPARO Logo](public/vite.svg)

**Report • Process • Resolve**

_A modern citizen reporting platform for Local Government Units in the Philippines_

[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1.2-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.12-teal.svg)](https://tailwindcss.com/)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [API Integration](#api-integration)
- [Building for Production](#building-for-production)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

RIPARO Frontend is a sophisticated web application designed to streamline communication between citizens and their Local Government Units (LGUs). Built with modern web technologies, it provides an intuitive interface for reporting community issues, tracking progress, and facilitating transparent governance.

### What RIPARO Does

RIPARO serves as a digital bridge connecting citizens with their local government, enabling:

- **Citizen Reporting**: Submit infrastructure, sanitation, community welfare, and behavioral concerns
- **Real-time Tracking**: Monitor report progress from submission to resolution
- **Multi-role Access**: Separate portals for citizens, administrators, and mayors
- **Document Management**: Upload photos and supporting documents
- **Feedback System**: Direct communication channel with LGU officials

---

## Features

### For Citizens

- **Intuitive Report Submission**: Easy-to-use forms with photo upload capabilities
- **Progress Tracking**: Real-time status updates on submitted reports
- **Profile Management**: Secure account management with verification system
- **Feedback Portal**: Direct communication with local government
- **Mobile Responsive**: Works seamlessly on all devices

### For Administrators

- **Report Management**: Review, assign, and update report statuses
- **User Verification**: Approve or reject citizen registrations
- **Analytics Dashboard**: Comprehensive reporting and statistics
- **Document Review**: Access uploaded photos and supporting materials
- **Update Requests**: Handle citizen profile modification requests

### For Mayors

- **Executive Dashboard**: High-level overview of all activities
- **Statistical Analysis**: Charts and graphs showing report trends
- **User Management**: Oversight of citizen verification processes
- **Feedback Review**: Access to citizen feedback and suggestions

---

## Technology Stack

### Core Technologies

- **React 19.1.1**: Modern JavaScript library for building user interfaces
- **TypeScript 5.8.3**: Type-safe JavaScript for better development experience
- **Vite 7.1.2**: Fast build tool and development server

### Styling & UI

- **Tailwind CSS 4.1.12**: Utility-first CSS framework for rapid UI development
- **Custom Components**: Reusable, accessible UI components
- **Responsive Design**: Mobile-first approach ensuring cross-device compatibility

### Data Visualization

- **Chart.js 4.5.0**: Interactive charts and graphs for analytics
- **React Chart.js 2**: React integration for Chart.js

### Development Tools

- **ESLint**: Code linting and quality assurance
- **TypeScript ESLint**: TypeScript-specific linting rules
- **React Hooks ESLint**: React hooks linting rules

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

- **Node.js**: Version 18.0 or higher
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`
- **npm**: Comes with Node.js
  - Verify installation: `npm --version`

### Recommended Software

- **Git**: For version control
  - Download from [git-scm.com](https://git-scm.com/)
- **Code Editor**: Visual Studio Code or Cursor
  - Download from [code.visualstudio.com](https://code.visualstudio.com/)

### Backend Requirements

- **RIPARO Backend**: The Laravel API server must be running
- **Database**: MySQL/PostgreSQL database configured
- **PHP**: Version 8.1 or higher for the backend

---

## Installation

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/riparo-frontend.git

# Navigate to the project directory
cd riparo-frontend
```

### Step 2: Install Dependencies

```bash
# Install all required packages
npm install
```

This command will install all dependencies listed in `package.json`, including:

- React and React DOM
- TypeScript and type definitions
- Vite build tool
- Tailwind CSS
- Chart.js and React Chart.js 2
- ESLint and related plugins

### Step 3: Verify Installation

```bash
# Check if all dependencies are installed correctly
npm list --depth=0
```

---

## Configuration

### Environment Setup

1. **Create Environment File** (if needed):

   ```bash
   # Copy the example environment file
   cp .env.example .env.local
   ```

2. **Configure API Endpoint**:
   Edit `.env.local` and set your backend API URL:
   ```
   VITE_API_URL=http://localhost:8000/api
   ```

### Backend Connection

Ensure your RIPARO Backend is running on `http://localhost:8000` before starting the frontend.

---

## Usage

### Development Mode

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

### Accessing the Application

1. **Open your web browser**
2. **Navigate to** `http://localhost:5173`
3. **Choose your role**:
   - Citizen Portal: `http://localhost:5173/#/login/citizen`
   - Admin Portal: `http://localhost:5173/#/login/admin`
   - Mayor Portal: `http://localhost:5173/#/login/mayor`

---

## Project Structure

```
riparo-frontend/
├── public/                 # Static assets
│   ├── vite.svg           # Application logo
│   └── ...
├── src/                   # Source code
│   ├── components/        # React components
│   │   ├── Auth.tsx       # Authentication component
│   │   ├── CitizenDashboard.tsx
│   │   ├── MayorDashboard.tsx
│   │   ├── StaffDashboard.tsx
│   │   ├── Modal.tsx
│   │   ├── ReportCard.tsx
│   │   └── ReportTimeline.tsx
│   ├── assets/           # Images and static files
│   │   ├── react.svg
│   │   └── san_jose_bg.jpg
│   ├── App.tsx           # Main application component
│   ├── App.css           # Global styles
│   ├── index.css         # Tailwind CSS imports
│   └── main.tsx          # Application entry point
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts       # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── README.md            # This file
```

---

## User Roles

### Citizen Portal

**Purpose**: For community members to report issues and track progress

**Features**:

- Account registration with ID verification
- Report submission with photo uploads
- Progress tracking dashboard
- Feedback submission
- Profile management

**Access**: `/#/login/citizen`

### Administrator Portal

**Purpose**: For LGU staff to manage reports and users

**Features**:

- Report review and status updates
- User verification management
- Analytics dashboard
- Feedback review
- Update request processing

**Access**: `/#/login/admin`

### Mayor Portal

**Purpose**: For executive oversight and high-level analytics

**Features**:

- Executive dashboard with key metrics
- Statistical analysis and charts
- User management oversight
- Feedback review
- Update request monitoring

**Access**: `/#/login/mayor`

---

## API Integration

### Authentication

- **Login**: `POST /api/login`
- **Registration**: `POST /api/register`
- **Logout**: `POST /api/logout`

### Reports

- **Submit Report**: `POST /api/reports`
- **Get Reports**: `GET /api/reports`
- **Get My Reports**: `GET /api/my-reports`
- **Update Progress**: `PUT /api/reports/{id}/progress`

### User Management

- **Get Users**: `GET /api/users`
- **Update User Status**: `PUT /api/users/{id}/status`
- **Profile Update Request**: `POST /api/profile/update-request`

### Feedback

- **Submit Feedback**: `POST /api/feedback`
- **Get Feedback**: `GET /api/feedback`

---

## Building for Production

### Create Production Build

```bash
# Build the application for production
npm run build
```

This creates a `dist/` folder with optimized files ready for deployment.

### Deploy to Web Server

1. **Upload the `dist/` folder** to your web server
2. **Configure your web server** to serve the files
3. **Ensure API endpoints** are accessible from your domain
4. **Update environment variables** for production

### Production Checklist

- [ ] Backend API is deployed and accessible
- [ ] Database is configured and migrated
- [ ] Environment variables are set correctly
- [ ] SSL certificate is installed (recommended)
- [ ] Domain name is configured
- [ ] Error monitoring is set up

---

## Troubleshooting

### Common Issues

#### 1. "Cannot connect to API"

**Problem**: Frontend cannot reach the backend
**Solution**:

- Verify backend is running on `http://localhost:8000`
- Check API URL in environment variables
- Ensure CORS is configured in backend

#### 2. "Module not found" errors

**Problem**: Missing dependencies
**Solution**:

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 3. "Build failed" errors

**Problem**: TypeScript or linting errors
**Solution**:

```bash
# Check for TypeScript errors
npm run build

# Fix linting issues
npm run lint
```

#### 4. "Page not loading"

**Problem**: Development server issues
**Solution**:

```bash
# Restart development server
npm run dev

# Check if port 5173 is available
netstat -an | grep 5173
```

### Getting Help

1. **Check the console** for error messages
2. **Review the network tab** in browser developer tools
3. **Verify backend connectivity** by testing API endpoints
4. **Check environment variables** are set correctly

---

## Contributing

We welcome contributions to improve RIPARO! Here's how you can help:

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Standards

- Follow TypeScript best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Ensure responsive design
- Test on multiple browsers

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**RIPARO Frontend** - Empowering communities through technology

Built with ❤️ for Local Government Units in the Philippines

[Report an Issue](https://github.com/YOUR_USERNAME/riparo-frontend/issues) • [Request a Feature](https://github.com/YOUR_USERNAME/riparo-frontend/issues) • [View Backend](https://github.com/YOUR_USERNAME/riparo-backend)

</div>
