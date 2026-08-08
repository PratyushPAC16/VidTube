import axiosInstance from "./axiosInstance";

export const registerUser = (formData) =>
  axiosInstance.post("/users/register", formData); // formData for file uploads

export const loginUser = (data) =>
  axiosInstance.post("/users/login", data);

export const logoutUser = () =>
  axiosInstance.post("/users/logout");

export const getCurrentUser = () =>
  axiosInstance.get("/users/current-user");

export const getUserChannel = (username) =>
  axiosInstance.get(`/users/c/${username}`);

export const updateAccountDetails = (data) =>
  axiosInstance.patch("/users/update-account", data);

export const updateAvatar = (formData) =>
  axiosInstance.patch("/users/avatar", formData);

export const updateCoverImage = (formData) =>
  axiosInstance.patch("/users/coverImage", formData);

export const changePassword = (data) =>
  axiosInstance.post("/users/change-password", data);

export const getWatchHistory = () =>
  axiosInstance.get("/users/history");
