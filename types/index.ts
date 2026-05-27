export interface User {
  uid: string;
  fullName: string;
  username: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  gender?: string;
  interests: string[];
  followersCount: number;
  followingCount: number;
  pollsCreated: number;
  createdAt: number;
  savedPolls?: string[];
  polls?: string[];
}

export interface Poll {
  pollId: string;
  question: string;
  options: string[];
  imageUrl?: string;
  category: string;
  privacy: "public" | "community" | "anonymous";
  expiresAt?: number;
  createdBy: string;
  createdAt: number;
  totalVotes: number;
  commentCount: number;
}

export interface Vote {
  uid: string;
  optionIndex: number;
  timestamp: number;
}

export interface Comment {
  commentId: string;
  pollId: string;
  uid: string;
  text: string;
  createdAt: number;
}

export interface Group {
  groupId: string;
  name: string;
  description: string;
  coverUrl?: string;
  ownerId: string;
  members: string[];
  privacy: "public" | "private" | "invite";
  inviteCode: string;
  createdAt: number;
}

export interface ActivityItem {
  id: string;
  type: "vote" | "comment" | "follow" | "milestone" | "group_invite";
  fromUid: string;
  fromName: string;
  fromAvatar?: string;
  pollId?: string;
  pollQuestion?: string;
  commentPreview?: string;
  milestone?: number;
  timestamp: number;
  read: boolean;
}
