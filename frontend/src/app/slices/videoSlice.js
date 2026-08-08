import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getAllVideos, getVideoById } from "../../api/video.api";

export const fetchVideos = createAsyncThunk("video/fetchVideos", async (params, { rejectWithValue }) => {
  try {
    const res = await getAllVideos(params);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const fetchVideoById = createAsyncThunk("video/fetchVideoById", async (videoId, { rejectWithValue }) => {
  try {
    const res = await getVideoById(videoId);
    return res.data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

const videoSlice = createSlice({
  name: "video",
  initialState: {
    videos: [],
    currentVideo: null,
    pagination: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrentVideo: (state) => { state.currentVideo = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVideos.pending, (state) => { state.loading = true; })
      .addCase(fetchVideos.fulfilled, (state, action) => {
        state.loading = false;
        state.videos = action.payload.docs;
        state.pagination = {
          totalDocs: action.payload.totalDocs,
          totalPages: action.payload.totalPages,
          page: action.payload.page,
          limit: action.payload.limit,
        };
      })
      .addCase(fetchVideos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchVideoById.pending, (state) => { state.loading = true; })
      .addCase(fetchVideoById.fulfilled, (state, action) => {
        state.loading = false;
        const video = action.payload;
        // Fix http:// Cloudinary URLs to https://
        if (video?.videoFile) video.videoFile = video.videoFile.replace("http://", "https://");
        if (video?.thumbnail) video.thumbnail = video.thumbnail.replace("http://", "https://");
        state.currentVideo = video;
      })
      .addCase(fetchVideoById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentVideo } = videoSlice.actions;
export default videoSlice.reducer;
