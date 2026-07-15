# A full stack web application that centralizes institutional scholarship system. Students can browse , apply and track scholarships while admins can create and manage them.

# Screenshots
Landing Page - https://github.com/user-attachments/assets/2b777d81-825f-4563-8409-0dbec4f90157
Studnet Dashboard - https://github.com/user-attachments/assets/79ab5f45-ccbd-4ca5-bae0-3d814eca9b92
Scholarship Details - https://github.com/user-attachments/assets/11b3111f-1273-472e-9013-899ec52615b6
                      https://github.com/user-attachments/assets/9df75319-6cea-4304-898a-9f79d536c6d7
Admin Dashboard - https://github.com/user-attachments/assets/a33c3add-5751-472d-b5b4-d464f45e8d2a
                  https://github.com/user-attachments/assets/d5c6285c-2451-4373-a75b-5dea592c9d1b
                  https://github.com/user-attachments/assets/4d9212f4-de15-452e-970d-fd440d057e83


# Features
  # Students
    Register and login securely.
    Check all the scholarships and their eligibility criteria along with total seats and deadline.
    View scholarship detail page with required documents.
    Submit application with documents and personal statements and can track the status.

  # Admins
    Create scholarships with all the relevant details like title , description , amount , eligibility criteria , etc.
    Add the required documents with all the scholarships.
    View all the student applications with documents and personal statements.
    Approve or reject applications.

# Tech Stack
  -Frontend - HTML, CSS, JavaSript
  -Backend - Node.js, Express.js
  -Database - MySQL
  -Authentication - JWT(Json Web Token)
  -Password Hashing - Bycrypt
  -File Uploads - Multer

# Project Structure
scholarship-system/
 -- controllers/
     -- authController.js     # all business logic
-- middleware/
     --authMiddleware.js      # JWT verification & role check
     -- upload.js             # multer file upload config
--routes/
     -- authRoutes.js         # all API routes
--public/
     --index.html            # landing page
     -- login.html
     -- register.html
     --student.html          # student dashboard
     -- scholarship-detail.html
     --admin.html            # admin dashboard
     -- script.js
     --style.css
--uploads/                  # uploaded documents (gitignored)
--db.js                     # database connection
--server.js                 # entry point
--schema.sql                # database schema
--.env                      # environment variables (gitignored)



