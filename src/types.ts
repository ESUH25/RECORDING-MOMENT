export type FacingMode = "user" | "environment";
export type CaptureMode = "photo" | "video";

export type CameraMode = CaptureMode;

export type Screen =
  | "splash"
  | "login"
  | "signup"
  | "camera"
  | "gallery"
  | "frame-studio"
  | "friends"
  | "comment-feed"
  | "group-room";

export interface MediaItem {
  id: string;
  type: CaptureMode;
  url: string;
  capturedAt: number;
}

export interface Comment {
  id: string;
  mediaId: string;
  authorName: string;
  text: string;
  createdAt: number;
  likes: string[];
}

export interface Friend {
  id: string;
  username: string;
  nickname: string;
  status: "pending" | "accepted";
  invitedAt: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  memberIds: string[];
  createdAt: number;
  coverColor: string;
}

export interface GroupComment {
  id: string;
  authorName: string;
  text: string;
  createdAt: number;
}

export interface GroupPost {
  id: string;
  groupId: string;
  authorName: string;
  caption: string;
  mediaUrl?: string;
  mediaType?: CaptureMode;
  createdAt: number;
  likes: string[];
  comments: GroupComment[];
}

export type CaptureItem = MediaItem;

export interface CameraFilter {
  id: string;
  name: string;
  css: string;
  matrix: number[] | null;
}
