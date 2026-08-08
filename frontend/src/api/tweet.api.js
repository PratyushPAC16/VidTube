import axiosInstance from "./axiosInstance";

export const createTweet = (content) =>
  axiosInstance.post("/tweets", { content });

export const getUserTweets = (userId) =>
  axiosInstance.get(`/tweets/user/${userId}`);

export const getSubscriptionFeed = () =>
  axiosInstance.get("/tweets/feed");

export const updateTweet = (tweetId, content) =>
  axiosInstance.patch(`/tweets/${tweetId}`, { content });

export const deleteTweet = (tweetId) =>
  axiosInstance.delete(`/tweets/${tweetId}`);

