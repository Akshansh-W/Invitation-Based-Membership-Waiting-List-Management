const backendUrl = import.meta.env.VITE_Backend_Url?.replace(/\/+$/, "");

if (!backendUrl) {
  throw new Error("VITE_Backend_Url is not configured in the frontend environment.");
}

export default backendUrl;
