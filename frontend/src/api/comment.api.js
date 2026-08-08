import axiosInstance from "./axiosInstance";

export const getVideoComments = (videoId, params) =>
  axiosInstance.get(`/comments/${videoId}`, { params }); // { page, limit }

export const addComment = (videoId, data) =>
  axiosInstance.post(`/comments/${videoId}`, data);

export const updateComment = (commentId, data) =>
  axiosInstance.patch(`/comments/c/${commentId}`, data);

export const deleteComment = (commentId) =>
  axiosInstance.delete(`/comments/c/${commentId}`);
