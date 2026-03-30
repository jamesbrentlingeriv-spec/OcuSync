export type UserRole = 'staff' | 'patient' | 'admin' | 'superadmin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  publicKey?: string;
  phoneNumber?: string;
  smsConsent?: boolean;
  role?: UserRole;
  organizationId?: string;
  isApproved: boolean;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  groupCode: string;
  assignedPhoneNumber: string;
  address?: string;
  contactEmail?: string;
  createdAt: string;
}

export interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  encryptedContent: string;
  timestamp: any;
  read?: boolean;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastTimestamp?: any;
  updatedAt: any;
  deletedBy?: string[];
  otherUser?: UserProfile;
}

export interface SMSConversation {
  id: string;
  phoneNumber: string;
  patientName?: string;
  lastMessage?: string;
  lastTimestamp?: any;
  updatedAt: any;
  deletedBy?: string[];
}

export interface SMSMessage {
  id?: string;
  to: string;
  content: string;
  timestamp: any;
  senderId: string;
  senderEmail?: string;
}
