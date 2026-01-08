import axios from "axios";

export const login = (data) =>
  axios.post("http://localhost:8000/auth/login", data);