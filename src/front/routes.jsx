import React from "react";
import { createBrowserRouter, createRoutesFromElements, Route } from "react-router-dom";

// Definición de rutas del frontend. Estructura principal:
// - "/" -> Layout base
// - "/dashboard" -> área autenticada con subrutas por rol
//     - student: entrevista y flujo de envío a revisión
//     - professional: revisión y aprobación/rechazo
//     - patient: confirmación o solicitud de cambios

import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { Single } from "./pages/Single";
import { Demo } from "./pages/Demo";
import Register from "./components/Register.jsx";
import Login from "./components/Login.jsx";
import DashLayout from "./pages/DashLayout.jsx";
import UsersTable from "./pages/UsersTable.jsx";
import AdminDash from "./pages/AdminDash.jsx";
import StudentDash from "./pages/StudentDash.jsx";
import ProfessionalDash from "./pages/ProfessionalDash.jsx";
import PatientDash from "./pages/PatientDash.jsx";
import BackGroundInterview from "./pages/BackGroundInterview.jsx";
import PatientRequestStudent from "./pages/PatientRequestStudent.jsx";
import StudentRequestProfessional from "./pages/StudentRequestProfessional.jsx";
import ValidationPatientRequest from "./pages/ValidationPatientRequest.jsx";
import StudentPatientProgress from "./pages/StudentPatientProgress.jsx";
import ValidationStudentRequest from "./pages/ValidationStudentRequest.jsx";
import StudentFilesReview from "./pages/StudentFilesReview.jsx";
import ConfirmFile from "./pages/ConfirmFile.jsx"; // Confirmación del paciente sobre expediente aprobado
import EcosistemPatient from "./pages/EcosistemPatient.jsx"; // Renombrado desde EcosystemAcademic (archivo físico)
import EcosystemProfessional from "./pages/EcosystemProfessional.jsx";
import EcosystemMultidisciplinary from "./pages/EcosystemMultidisciplinary.jsx";

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<Layout />} errorElement={<h1>Not found!</h1>}>
      <Route path="/" element={<Home />} />
      <Route path="/single/:theId" element={<Single />} />
      <Route path="/demo" element={<Demo />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      {/* Páginas informativas del ecosistema */}
      <Route path="/ecosistema/paciente" element={<EcosistemPatient />} />
      <Route path="/ecosistema/profesional" element={<EcosystemProfessional />} />
      <Route path="/ecosistema/multidisciplinario" element={<EcosystemMultidisciplinary />} />
      <Route path="/dashboard" element={<DashLayout />}>
        <Route path="admin" element={<AdminDash />} />
        <Route path="admin/users_table" element={<UsersTable />} />
        <Route path="student" element={<StudentDash />} />
        {/* Entrevista de antecedentes: genera snapshot y envía a revisión */}
        <Route path="student/interview/:medicalFileId" element={<BackGroundInterview />} />
        <Route path="student/request_approval" element={<StudentRequestProfessional />} />
        <Route path="student/patient_requests" element={<ValidationPatientRequest />} />
        <Route path="student/assigned_patients" element={<StudentPatientProgress />} />
        <Route path="professional" element={<ProfessionalDash />} />
        <Route path="professional/validate_students" element={<ValidationStudentRequest />} />
        {/* Revisión profesional: lista expedientes en estado review con snapshot */}
        <Route path="professional/review_files" element={<StudentFilesReview />} />
        <Route path="patient" element={<PatientDash />} />
        <Route path="patient/request_student" element={<PatientRequestStudent />} />
        {/* Confirmación del paciente: visualiza snapshot y confirma/rechaza */}
        <Route path="patient/confirm_file" element={<ConfirmFile />} />
      </Route>
    </Route>
  )
);
