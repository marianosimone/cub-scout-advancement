import data from './assets/requirements.json';

export const loadRequirements = (): Map<string, Map<string, string>> => {
  // Object.keys(data['Lion']).forEach((a) => {
  //   console.log(a);
  // });
  // console.log(`data is ${data}`)
  // console.log(`Lion is ${data['Lion']}`)
  return data;
  // fetch('../assets/requirements.json').then(response => response.json())
}
