# API Endpoint Contract & Data Specifications

This document outlines the API specifications for authentication, session rotation, and file uploads.

---

## 1. Authentication Endpoints

### Login (OAuth2 Password)
- **Route**: `POST /api/v1/auth/login`
- **Request Type**: `application/x-www-form-urlencoded`
- **Fields**:
  - `username` (string, required): Username or email.
  - `password` (string, required): Password.
- **Success Response** (200 OK):
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "token_type": "bearer"
  }
  ```

### Token Rotation (Refresh)
- **Route**: `POST /api/v1/auth/refresh`
- **Request Type**: `application/json`
- **Payload**:
  ```json
  {
    "refresh_token": "eyJhbGciOi..."
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "token_type": "bearer"
  }
  ```
- **Error Response** (401 Unauthorized):
  ```json
  {
    "detail": "Session revoked due to reuse or expiration"
  }
  ```

---

## 2. OTP Verification

### Send OTP
- **Route**: `POST /api/v1/auth/otp/send`
- **Payload**:
  ```json
  {
    "email": "user@example.com",
    "phone": null,
    "mode": "signup"
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
    "message": "Verification code sent",
    "sent_to": "user@example.com"
  }
  ```

### Verify OTP
- **Route**: `POST /api/v1/auth/otp/verify`
- **Payload**:
  ```json
  {
    "email": "user@example.com",
    "phone": null,
    "code": "123456"
  }
  ```
- **Success Response** (200 OK):
  ```json
  {
    "verified": true
  }
  ```

---

## 3. Storage & Uploads

### General Asset Upload
- **Route**: `POST /api/v1/uploads/`
- **Headers**: `Authorization: Bearer <access_token>`
- **Request Type**: `multipart/form-data`
- **Payload**:
  - `file` (file binary, required)
  - `question_id` (integer, optional)
  - `answer_id` (integer, optional)
- **Success Response** (200 OK):
  ```json
  {
    "id": 12,
    "file_name": "schematic.pdf",
    "file_url": "https://assets.embeddedcollective.com/attachments/unique-uuid.pdf",
    "size_bytes": 1048576,
    "mime_type": "application/pdf",
    "uploaded_at": "2026-06-23T12:00:00Z"
  }
  ```

### Profile Avatar Upload
- **Route**: `POST /api/v1/uploads/avatar`
- **Headers**: `Authorization: Bearer <access_token>`
- **Request Type**: `multipart/form-data`
- **Payload**:
  - `file` (image binary, required)
- **Success Response** (200 OK):
  ```json
  {
    "url": "https://assets.embeddedcollective.com/avatars/user-id.jpg"
  }
  ```

### Resume PDF Upload
- **Route**: `POST /api/v1/uploads/resume`
- **Headers**: `Authorization: Bearer <access_token>`
- **Request Type**: `multipart/form-data`
- **Payload**:
  - `file` (PDF binary, required)
- **Success Response** (200 OK):
  ```json
  {
    "url": "https://assets.embeddedcollective.com/resumes/user-id.pdf"
  }
  ```
