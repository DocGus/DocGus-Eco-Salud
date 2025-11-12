import React from "react";
import { useParams } from "react-router-dom";
import BackgroundForm from "../components/BackgroundForm.jsx";

// Página contenedora que delega en el componente unificado BackgroundForm
const BackGroundInterview = () => {
  const { medicalFileId } = useParams();
  return <BackgroundForm medicalFileId={medicalFileId} />;
};

export default BackGroundInterview;
