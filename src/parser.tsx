import data from './assets/requirements.json';
type AppData = typeof data;
export const loadRequirements = (): AppData => {
  return data;
}
