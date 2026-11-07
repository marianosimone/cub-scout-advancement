import requirementsData from "./assets/requirements.json";
type Requirements = typeof requirementsData;

export const loadRequirements = (): Requirements => {
  return requirementsData;
};
