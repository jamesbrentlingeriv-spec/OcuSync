import React, { useState, useEffect, useRef, Component } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  Timestamp, 
  limit, 
  getDocs,
  FirebaseUser,
  handleFirestoreError,
  OperationType,
  updateDoc,
  arrayUnion,
  arrayRemove,
  storage,
  ref,
  uploadBytes,
  getDownloadURL
} from './firebase';
import { UserProfile, Message, Conversation, Organization } from './types';
import { organizationService, userService } from './services/organizationService';
import { 
  MessageSquare, Send, Shield, LogOut, Search, User as UserIcon, 
  Lock, Check, CheckCheck, Loader2, Plus, ArrowLeft, ArrowRight, Phone, AlertCircle,
  Paperclip, File as FileIcon, Download, Users, Trash2, Clock, Building
} from 'lucide-react';
import { format } from 'date-fns';
import CryptoJS from 'crypto-js';
import { motion, AnimatePresence } from 'motion/react';
import { LandingPage } from './components/LandingPage';

// Encryption Utility
const ENCRYPTION_KEY_PREFIX = 'ocu_sync_';

const encryptMessage = (text: string, conversationId: string) => {
  const secret = ENCRYPTION_KEY_PREFIX + conversationId;
  return CryptoJS.AES.encrypt(text, secret).toString();
};

const decryptMessage = (ciphertext: string, conversationId: string) => {
  try {
    const secret = ENCRYPTION_KEY_PREFIX + conversationId;
    const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return '[Decryption Failed]';
  }
};

const OFFICE_EMAIL = 'jamesbrentlingeriv@gmail.com';

// Error Boundary Component
class ErrorBoundary extends (Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Something went wrong</h1>
            <p className="text-slate-600 mb-6">
              We've encountered an unexpected error. Please try refreshing the page.
            </p>
            {this.state.errorInfo && (
              <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left overflow-auto max-h-40 border border-slate-100">
                <code className="text-xs text-red-500 whitespace-pre-wrap">{this.state.errorInfo}</code>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const hasShownSplash = useRef(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [smsConsentInput, setSmsConsentInput] = useState(false);
  const [groupCodeInput, setGroupCodeInput] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [view, setView] = useState<'chat' | 'sms' | 'admin'>('chat');
  const [patientPhone, setPatientPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsStatus, setSmsStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [patientName, setPatientName] = useState('');
  const [officeProfile, setOfficeProfile] = useState<UserProfile | null>(null);
  const [isOfficeLoading, setIsOfficeLoading] = useState(true);
  const [requestStatus, setRequestStatus] = useState<{ type: 'success' | 'error' | 'loading', message: string } | null>(null);
  const [pendingStaff, setPendingStaff] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isAdminView, setIsAdminView] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);
  const [eyeglassWizard, setEyeglassWizard] = useState<{
    step: 'recipient' | 'name' | 'confirm';
    recipient?: 'me' | 'someone_else';
    name?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patientRequests = [
    'Eyeglass Prescription',
    'Contact Prescription',
    'Exam Records'
  ];

  const smsTemplates = [
    { label: 'Eyeglasses Ready', text: (name: string) => `Hello! Your eyeglasses are ready at Pal Optical! If you have any questions or concerns call (859) 266-3003.` },
    { label: 'Appt Reminder', text: (name: string) => `Hello! This is a reminder for your eye exam appointment tomorrow at 00:00 with Dr. Robbins. Reply with C to confirm. If you have any questions or need to cancel or reschedule please call (859) 269-6921.` },
    { label: 'Contacts Ready', text: (name: string) => `Hello! Your contacts are ready at Dr. Klecker and Robbins Office/Pal Optical. It will be $000 at pickup. For any questions or concerns please call (859) 269-6921.` },
    { label: 'Prescription Ready', text: (name: string) => `Hello! Your prescription is ready at Dr. Klecker and Robbins Office. Please call (859) 269-6921 if you have any questions.` },
  ];

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin' || user?.email === 'jamesbrentlingeriv@gmail.com';
  const isStaff = profile?.role === 'staff' || isAdmin;
  const [smsConversations, setSmsConversations] = useState<any[]>([]);

  const approveUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isApproved: true
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const deleteConversation = async (convoId: string) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this conversation? It will be hidden from your list but stored for compliance.')) return;
    
    try {
      await updateDoc(doc(db, 'conversations', convoId), {
        deletedBy: arrayUnion(user.uid)
      });
      if (activeConversation?.id === convoId) {
        setActiveConversation(null);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `conversations/${convoId}`);
    }
  };

  const deleteSMSConversation = async (smsConvoId: string) => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this SMS history? It will be hidden from your list but stored for compliance.')) return;
    
    try {
      await updateDoc(doc(db, 'sms_conversations', smsConvoId), {
        deletedBy: arrayUnion(user.uid)
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `sms_conversations/${smsConvoId}`);
    }
  };

  useEffect(() => {
    if (showSplash) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSplash]);

  useEffect(() => {
    let unsubOffice: (() => void) | null = null;
    let unsubPending: (() => void) | null = null;
    let unsubPatients: (() => void) | null = null;
    let unsubAllUsers: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        if (!hasShownSplash.current) {
          setShowSplash(true);
          hasShownSplash.current = true;
        }
        setUser(u);

        // Ensure Pal Optical exists as the first organization
        await organizationService.ensurePalOptical();

        const userDoc = await getDoc(doc(db, 'users', u.uid));
        let data: UserProfile | null = null;
        
        if (!userDoc.exists()) {
          const isSuperAdmin = u.email === OFFICE_EMAIL;
          const newProfile: any = {
            uid: u.uid,
            email: u.email || '',
            displayName: u.displayName || 'Anonymous',
            photoURL: u.photoURL || '',
            isApproved: isSuperAdmin,
            createdAt: serverTimestamp(),
            role: isSuperAdmin ? 'admin' : '', // No default role for new users
            organizationId: isSuperAdmin ? 'pal-optical' : '', // Superadmin defaults to Pal Optical
            phoneNumber: '',
            smsConsent: false
          };
          
          await setDoc(doc(db, 'users', u.uid), newProfile);
          setProfile(newProfile as UserProfile);
          setIsCompletingProfile(true);
        } else {
          data = userDoc.data() as UserProfile;
          
          if (u.email === OFFICE_EMAIL && (data.role !== 'admin' || !data.isApproved || !data.organizationId)) {
            data.role = 'admin';
            data.isApproved = true;
            data.organizationId = data.organizationId || 'pal-optical';
            try {
              await setDoc(doc(db, 'users', u.uid), { role: 'admin', isApproved: true, organizationId: data.organizationId }, { merge: true });
            } catch (e) {
              handleFirestoreError(e, OperationType.UPDATE, `users/${u.uid}`);
            }
          }
          
          setProfile(data);
          if (!data.phoneNumber || data.smsConsent === undefined || !data.organizationId || !data.role) {
            setIsCompletingProfile(true);
          }
        }

        // Fetch organization details
        if (data?.organizationId || 'pal-optical') {
          const org = await organizationService.getOrganization(data?.organizationId || 'pal-optical');
          setOrganization(org);
        }

        // Fetch office profile for patients
        setIsOfficeLoading(true);
        const officeQuery = query(
          collection(db, 'users'), 
          where('organizationId', '==', data?.organizationId || 'pal-optical'),
          where('role', '==', 'admin'),
          limit(1)
        );
        unsubOffice = onSnapshot(officeQuery, (snap) => {
          if (!snap.empty) {
            setOfficeProfile(snap.docs[0].data() as UserProfile);
          }
          setIsOfficeLoading(false);
        }, (e) => {
          console.error('Office query failed', e);
          setIsOfficeLoading(false);
        });

        // If admin, fetch all unapproved users in this organization
        if (isAdmin) {
          const pendingQuery = query(
            collection(db, 'users'),
            where('organizationId', '==', data?.organizationId || 'pal-optical'),
            where('isApproved', '==', false)
          );
          unsubPending = onSnapshot(pendingQuery, (snap) => {
            const pending = snap.docs.map(d => d.data() as UserProfile);
            setPendingStaff(pending);
          });

          const allUsersQuery = query(
            collection(db, 'users'), 
            where('organizationId', '==', data?.organizationId || 'pal-optical'),
            orderBy('createdAt', 'desc')
          );
          unsubAllUsers = onSnapshot(allUsersQuery, (snap) => {
            setAllUsers(snap.docs.map(d => d.data() as UserProfile));
          });
        }
      } else {
        setUser(null);
        setProfile(null);
        setOrganization(null);
        setConversations([]);
        setActiveConversation(null);
        setOfficeProfile(null);
        setIsOfficeLoading(false);
        setPendingStaff([]);
        setAllUsers([]);
        if (unsubOffice) {
          unsubOffice();
          unsubOffice = null;
        }
        if (unsubPending) {
          unsubPending();
          unsubPending = null;
        }
        if (unsubPatients) {
          unsubPatients();
          unsubPatients = null;
        }
        if (unsubAllUsers) {
          unsubAllUsers();
          unsubAllUsers = null;
        }
      }
      setLoading(false);
    });
    return () => {
      unsubscribe();
      if (unsubOffice) unsubOffice();
      if (unsubPending) unsubPending();
      if (unsubPatients) unsubPatients();
      if (unsubAllUsers) unsubAllUsers();
    };
  }, [profile]);

  const handlePatientRequest = async (requestType: string) => {
    if (!user) return;
    
    if (!officeProfile) {
      setRequestStatus({ 
        type: 'error', 
        message: isOfficeLoading 
          ? 'Connecting to office...' 
          : 'Office profile not found. The office staff needs to sign in first to activate the portal.' 
      });
      return;
    }

    setRequestStatus({ type: 'loading', message: `Requesting ${requestType}...` });

    try {
      const conversationId = [user.uid, officeProfile.uid].sort().join('_');
      const encrypted = encryptMessage(`Request: ${requestType}`, conversationId);
      const orgId = profile?.organizationId || 'pal-optical';
      
      // Ensure conversation exists
      const convoDoc = await getDoc(doc(db, 'organizations', orgId, 'conversations', conversationId));
      if (!convoDoc.exists()) {
        await setDoc(doc(db, 'organizations', orgId, 'conversations', conversationId), {
          participants: [user.uid, officeProfile.uid],
          updatedAt: serverTimestamp(),
          lastTimestamp: serverTimestamp(),
          organizationId: orgId
        });
      }

      const msgData = {
        senderId: user.uid,
        receiverId: officeProfile.uid,
        encryptedContent: encrypted,
        timestamp: serverTimestamp(),
        read: false,
      };

      await addDoc(collection(db, 'organizations', orgId, 'conversations', conversationId, 'messages'), msgData);
      await setDoc(doc(db, 'organizations', orgId, 'conversations', conversationId), {
        lastMessage: encrypted,
        lastTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Set active conversation to show the message was sent
      setActiveConversation({
        id: conversationId,
        participants: [user.uid, officeProfile.uid],
        otherUser: officeProfile,
        updatedAt: serverTimestamp()
      } as Conversation);

      setRequestStatus({ type: 'success', message: `${requestType} requested successfully!` });
      
      // Clear status after 3 seconds
      setTimeout(() => setRequestStatus(null), 3000);
    } catch (e) {
      console.error('Patient request failed', e);
      setRequestStatus({ type: 'error', message: 'Failed to send request. Please try again or call the office.' });
      // Log the error but don't let it crash the UI
      try {
        handleFirestoreError(e, OperationType.WRITE, 'conversations');
      } catch (err) {
        // Error already logged by handleFirestoreError
      }
    }
  };

  useEffect(() => {
    if (!user || !profile?.organizationId) return;

    const q = query(
      collection(db, 'organizations', profile?.organizationId || 'pal-optical', 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convos: Conversation[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as Conversation;
        
        // Filter out conversations deleted by the current user
        if (data.deletedBy?.includes(user.uid)) continue;

        const otherUserId = data.participants.find(p => p !== user.uid);
        if (otherUserId) {
          try {
            const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
            data.otherUser = otherUserDoc.data() as UserProfile;
          } catch (e) {
            console.error('Failed to fetch user profile', e);
          }
        }
        convos.push({ ...data, id: docSnap.id });
      }
      setConversations(convos);
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, `organizations/${profile?.organizationId || 'pal-optical'}/conversations`);
    });

    return () => unsubscribe();
  }, [user, profile?.organizationId]);

  useEffect(() => {
    if (!user || !isStaff || !profile?.organizationId) return;

    const q = query(
      collection(db, 'organizations', profile?.organizationId || 'pal-optical', 'sms_conversations'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs
        .map(docSnap => ({ ...docSnap.data(), id: docSnap.id }))
        .filter((c: any) => !c.deletedBy?.includes(user.uid));
      setSmsConversations(convos);
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, `organizations/${profile?.organizationId || 'pal-optical'}/sms_conversations`);
    });

    return () => unsubscribe();
  }, [user, profile]);

  useEffect(() => {
    if (!activeConversation || !profile?.organizationId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'organizations', profile?.organizationId || 'pal-optical', 'conversations', activeConversation.id, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map(docSnap => ({
        ...docSnap.data() as Message,
        id: docSnap.id
      }));
      setMessages(msgs);
      scrollToBottom();
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, `organizations/${profile?.organizationId || 'pal-optical'}/conversations/${activeConversation.id}/messages`);
    });

    return () => unsubscribe();
  }, [activeConversation, profile?.organizationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login failed', error);
      if (error.code === 'auth/unauthorized-domain') {
        alert('Login failed: This domain is not authorized in the Firebase Console. Please add your GoDaddy domain to the "Authorized Domains" list in Firebase Authentication settings.');
      } else {
        alert('Login failed: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };
  
  const handleCompleteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!phoneNumberInput.trim()) {
      alert('Please enter your phone number.');
      return;
    }
    
    if (!smsConsentInput) {
      alert('Please agree to the SMS communication terms.');
      return;
    }

    let orgId = profile?.organizationId;
    if (!orgId) {
      if (!groupCodeInput.trim()) {
        alert('Please enter your Group Code.');
        return;
      }
      const targetOrg = await organizationService.getOrganizationByGroupCode(groupCodeInput.trim());
      if (!targetOrg) {
        alert('Invalid Group Code. Please check with your office.');
        return;
      }
      orgId = targetOrg.id;
    }
    
    const updatedProfile = {
      ...(profile || {}),
      uid: user.uid,
      email: user.email,
      phoneNumber: phoneNumberInput,
      smsConsent: smsConsentInput,
      organizationId: orgId,
      updatedAt: serverTimestamp()
    };
    
    try {
      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      setProfile(updatedProfile as UserProfile);
      setIsCompletingProfile(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  const handleSelectRole = async (role: 'staff' | 'patient') => {
    if (!user || !usernameInput.trim()) {
      alert('Please enter a username first.');
      return;
    }
    
    if (!phoneNumberInput.trim()) {
      alert('Please enter your phone number.');
      return;
    }
    
    if (!smsConsentInput) {
      alert('Please agree to the SMS communication terms.');
      return;
    }

    if (!groupCodeInput.trim()) {
      alert('Please enter your Group Code.');
      return;
    }
    
    const username = usernameInput.trim().toLowerCase();
    
    // Check if username is already taken
    try {
      const q = query(collection(db, 'users'), where('username', '==', username), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        alert('This username is already taken. Please choose another one.');
        return;
      }
    } catch (e) {
      console.error('Username check failed', e);
    }

    // Validate Group Code
    const targetOrg = await organizationService.getOrganizationByGroupCode(groupCodeInput.trim());
    if (!targetOrg) {
      alert('Invalid Group Code. Please check with your office.');
      return;
    }

    const isApproved = user.email === OFFICE_EMAIL || (role === 'patient'); // Patients are auto-approved, staff need approval
    const finalRole = profile?.role || role || 'patient';
    const orgId = targetOrg.id;
    
    const updatedProfile = { 
      ...(profile || {}),
      uid: user.uid,
      email: user.email,
      role: finalRole, 
      isApproved, 
      username, 
      phoneNumber: phoneNumberInput.trim(),
      smsConsent: smsConsentInput,
      organizationId: orgId,
      updatedAt: serverTimestamp()
    };
    try {
      await setDoc(doc(db, 'users', user.uid), updatedProfile, { merge: true });
      setProfile(updatedProfile as UserProfile);
      setIsCompletingProfile(false);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleApproveUser = async (uid: string) => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'users', uid), { isApproved: true }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    try {
      const usersRef = collection(db, 'users');
      const term = searchTerm.trim().toLowerCase();
      const orgId = profile?.organizationId || 'pal-optical';
      
      // Search by username
      const qUsername = query(
        usersRef, 
        where('organizationId', '==', orgId),
        where('username', '==', term), 
        limit(5)
      );
      // Search by email
      const qEmail = query(
        usersRef, 
        where('organizationId', '==', orgId),
        where('email', '==', term), 
        limit(5)
      );
      
      const [snapUsername, snapEmail] = await Promise.all([
        getDocs(qUsername),
        getDocs(qEmail)
      ]);
      
      const results = [
        ...snapUsername.docs.map(d => d.data() as UserProfile),
        ...snapEmail.docs.map(d => d.data() as UserProfile)
      ].filter((p, index, self) => 
        p.uid !== user?.uid && self.findIndex(t => t.uid === p.uid) === index
      );
      
      setSearchResults(results);
      setIsSearching(false);
    } catch (error) {
      console.error('Search failed', error);
      setIsSearching(false);
    }
  };

  const startConversation = async (otherUser: UserProfile) => {
    // Check if conversation already exists
    const existing = conversations.find(c => c.participants.includes(otherUser.uid));
    if (existing) {
      setActiveConversation(existing);
      setSearchResults([]);
      setSearchTerm('');
      return;
    }

    const conversationId = [user!.uid, otherUser.uid].sort().join('_');
    const orgId = profile?.organizationId || 'pal-optical';
    const newConvo = {
      participants: [user!.uid, otherUser.uid],
      updatedAt: serverTimestamp(),
      lastTimestamp: serverTimestamp(),
      organizationId: orgId
    };

    await setDoc(doc(db, 'organizations', orgId, 'conversations', conversationId), newConvo);
    setActiveConversation({ ...newConvo, id: conversationId, otherUser } as Conversation);
    setSearchResults([]);
    setSearchTerm('');
  };

  useEffect(() => {
    if (!isAdmin || !user) return;

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ ...doc.data() as UserProfile, uid: doc.id }));
      setAllUsers(users);
    }, (e) => {
      handleFirestoreError(e, OperationType.LIST, 'users');
    });

    return () => unsubscribe();
  }, [isAdmin, user]);

  const handleUpdateUserRole = async (userId: string, newRole: 'staff' | 'patient' | 'admin') => {
    if (!isAdmin) return;
    try {
      await setDoc(doc(db, 'users', userId), { role: newRole, isApproved: true }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Attempting to send message...', { newMessage, selectedFile, activeConversation, user });
    if ((!newMessage.trim() && !selectedFile) || !activeConversation || !user) {
      console.log('Send message blocked: missing data', { 
        hasMessage: !!newMessage.trim(), 
        hasFile: !!selectedFile, 
        hasConversation: !!activeConversation, 
        hasUser: !!user 
      });
      return;
    }

    setIsUploading(true);
    try {
      const orgId = profile?.organizationId || 'pal-optical';
      let fileData = {};
      if (selectedFile) {
        console.log('Uploading file...', selectedFile.name);
        const fileId = Math.random().toString(36).substring(2) + '_' + Date.now();
        const storagePath = `organizations/${orgId}/conversations/${activeConversation.id}/files/${fileId}_${selectedFile.name}`;
        const storageRef = ref(storage, storagePath);
        
        await uploadBytes(storageRef, selectedFile);
        const downloadUrl = await getDownloadURL(storageRef);
        console.log('File uploaded successfully:', downloadUrl);
        
        fileData = {
          fileUrl: downloadUrl,
          fileName: selectedFile.name,
          fileType: selectedFile.type
        };
      }

      if (!activeConversation.otherUser) {
        console.error('Cannot send message: otherUser is missing', activeConversation);
        alert('Failed to send message: recipient profile not found.');
        return;
      }

      const content = newMessage.trim() || (selectedFile ? `[File: ${selectedFile.name}]` : '');
      const encrypted = encryptMessage(content, activeConversation.id);
      const msgData = {
        senderId: user.uid,
        receiverId: activeConversation.otherUser.uid,
        encryptedContent: encrypted,
        timestamp: serverTimestamp(),
        read: false,
        ...fileData
      };

      console.log('Sending message data to Firestore...', msgData);

      setNewMessage('');
      setSelectedFile(null);
      setFilePreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await addDoc(collection(db, 'organizations', orgId, 'conversations', activeConversation.id, 'messages'), msgData);
      console.log('Message added to collection');
      
      await setDoc(doc(db, 'organizations', orgId, 'conversations', activeConversation.id), {
        lastMessage: encrypted,
        lastTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deletedBy: arrayRemove(user.uid)
      }, { merge: true });
      console.log('Conversation updated');
    } catch (error) {
      console.error('Send message failed', error);
      alert('Failed to send message. Please try again.');
      const orgId = profile?.organizationId || 'pal-optical';
      handleFirestoreError(error, OperationType.WRITE, `organizations/${orgId}/conversations/${activeConversation.id}/messages`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation || !user || (profile?.role !== 'staff' && profile?.role !== 'admin' && user?.email !== 'jamesbrentlingeriv@gmail.com')) return;

    // Limit file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('File is too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handleSendSMS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientPhone.trim() || !smsMessage.trim()) return;

    let formattedPhone = patientPhone.trim();
    // Basic E.164 formatting: if it doesn't start with +, assume US (+1) and strip non-digits
    if (!formattedPhone.startsWith('+')) {
      const digits = formattedPhone.replace(/\D/g, '');
      if (digits.length === 10) {
        formattedPhone = '+1' + digits;
      } else if (digits.length === 11 && digits.startsWith('1')) {
        formattedPhone = '+' + digits;
      }
    }

    setIsSendingSms(true);
    setSmsStatus(null);

    try {
      const orgId = profile?.organizationId || 'pal-optical';
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formattedPhone,
          message: smsMessage.trim(),
          organizationId: orgId
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setSmsStatus({ type: 'success', message: 'SMS sent successfully!' });
        
        // Store SMS in history for HIPAA compliance
        const smsConvoId = formattedPhone.replace('+', '');
        const smsData = {
          to: formattedPhone,
          content: smsMessage.trim(),
          timestamp: serverTimestamp(),
          senderId: user?.uid,
          senderEmail: user?.email,
          organizationId: orgId
        };

        try {
          await addDoc(collection(db, 'organizations', orgId, 'sms_conversations', smsConvoId, 'messages'), smsData);
          await setDoc(doc(db, 'organizations', orgId, 'sms_conversations', smsConvoId), {
            id: smsConvoId,
            phoneNumber: formattedPhone,
            patientName: patientName.trim() || 'Unknown Patient',
            lastMessage: smsMessage.trim(),
            lastTimestamp: serverTimestamp(),
            updatedAt: serverTimestamp(),
            organizationId: orgId,
            deletedBy: arrayRemove(user?.uid || '') // Ensure it's visible again if it was deleted
          }, { merge: true });
        } catch (e) {
          console.error('Failed to store SMS history', e);
        }

        setSmsMessage('');
      } else {
        setSmsStatus({ type: 'error', message: data.error || 'Failed to send SMS' });
      }
    } catch (error) {
      setSmsStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsSendingSms(false);
    }
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.1 }}
          className="flex flex-col items-center gap-8"
        >
          <div className="relative w-48 h-48 flex items-center justify-center">
            <img 
              src="/ocusync.gif" 
              alt="Loading..." 
              className="absolute inset-0 w-full h-full object-contain" 
              referrerPolicy="no-referrer"
            />
            <img 
              src="/ocu-sync.png" 
              alt="OCU-SYNC Logo" 
              className="relative w-20 h-20 object-contain z-10" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-slate-900 tracking-tight mb-2">OCU-SYNC</div>
            <div className="text-blue-600 font-bold tracking-[0.2em] text-[10px] uppercase animate-pulse">
              Initializing Secure Sync...
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <LandingPage onLogin={handleLogin} />;
  }

  // Pending Approval View
  if (user && profile && !profile.isApproved && !isAdmin) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 relative overflow-hidden p-4">
        {/* Background Video */}
        <div className="absolute inset-0 z-0 opacity-10">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/ocusync.mp4" type="video/mp4" />
          </video>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 text-center"
        >
          <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-100 border border-slate-100">
            <img src="/ocu-sync.png" alt="Logo" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Account Pending Approval</h1>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Thank you for joining OCU-SYNC. Your account is currently under review by our administration team. 
            You will be granted access once your identity has been verified.
          </p>
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-sm text-blue-700 mb-8">
            <p className="font-semibold">What happens next?</p>
            <p className="mt-1 opacity-80">Our team typically reviews new accounts within 24-48 business hours.</p>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </motion.div>
      </div>
    );
  }

  // Profile Completion View (New users or missing info)
  if (user && profile && isCompletingProfile) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center"
        >
          <div className="w-32 h-32 flex items-center justify-center mx-auto mb-6">
            <img src="/ocu-sync.png" alt="OCU-SYNC Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Complete Your Profile</h1>
          <p className="text-slate-500 mb-6">Please provide the following information to continue.</p>
          
          <form onSubmit={(e) => e.preventDefault()}>
            {(!profile.role || !profile.organizationId) && (
              <>
                <div className="mb-6 text-left">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Username</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. dr_smith"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                      maxLength={20}
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Only letters, numbers, and underscores allowed.</p>
                </div>

                <div className="mb-6 text-left">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Group Code</label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter your office's group code"
                      value={groupCodeInput}
                      onChange={(e) => setGroupCodeInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Ask your office for this code (e.g. 1555 for Pal Optical).</p>
                </div>
              </>
            )}

            <div className="mb-6 text-left">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number (For SMS Reminders)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  placeholder="+15550000000"
                  value={phoneNumberInput}
                  onChange={(e) => setPhoneNumberInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Include country code (e.g. +1 for USA).</p>
            </div>

            <div className="mb-8 text-left">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center mt-1">
                  <input
                    type="checkbox"
                    checked={smsConsentInput}
                    onChange={(e) => setSmsConsentInput(e.target.checked)}
                    className="peer sr-only"
                    required
                  />
                  <div className="w-5 h-5 border-2 border-slate-200 rounded flex items-center justify-center peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all group-hover:border-blue-400">
                    <Check className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                </div>
                <span className="text-xs text-slate-500 leading-relaxed">
                  I agree that SMS is not a secure form of communication. I am allowing SMS communication anyway for appointment reminders and office updates.
                </span>
              </label>
            </div>

            {profile.role ? (
              <button
                type="button"
                onClick={handleCompleteProfile}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-blue-100"
              >
                Update Profile
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleSelectRole('patient')}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group shadow-lg shadow-blue-100"
                >
                  Join as Patient
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectRole('staff')}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 group"
                >
                  Join as Office Staff
                  <ArrowLeft className="w-5 h-5 rotate-180" />
                </button>
              </div>
            )}
          </form>
          
          <button onClick={handleLogout} className="mt-8 text-sm text-slate-400 hover:text-red-500 flex items-center justify-center gap-2 mx-auto">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </motion.div>
      </div>
    );
  }

  // Pending Approval View
  if (profile?.role === 'staff' && !profile.isApproved) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center"
        >
          <div className="w-32 h-32 flex items-center justify-center mx-auto mb-6">
            <img src="/ocu-sync.png" alt="OCU-SYNC Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Approval Pending</h1>
          <p className="text-slate-500 mb-8">
            Your staff account has been created but requires approval from the administrator. 
            You will be able to access the portal once approved.
          </p>
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-sm mb-8">
            Contact James Brentlinger for approval.
          </div>
          <button onClick={handleLogout} className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </motion.div>
      </div>
    );
  }

  // Patient Portal View
  if (profile?.role === 'patient') {
    return (
      <div className="h-screen flex flex-col bg-slate-50 font-sans">
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 flex items-center justify-center">
              <img src="/ocu-sync.png" alt="OCU-SYNC Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-900">Patient Portal</h1>
              <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Secure Encrypted Connection
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Request Records</h2>
                <p className="text-slate-500 text-sm mb-6">
                  Select an option below to securely request your records. For any other questions or concerns, please call <span className="font-bold text-blue-600">{organization?.assignedPhoneNumber || '(859) 269-6921'}</span>.
                </p>
                
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => setEyeglassWizard({ step: 'recipient' })}
                    className="w-full p-4 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-xl text-left transition-all flex items-center justify-between group shadow-lg shadow-blue-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-blue-400">
                        <img src="/ocu-sync.png" alt="Logo" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <span className="font-bold text-white">Are my eyeglasses ready?</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-blue-200 group-hover:text-white transition-colors" />
                  </button>

                  {patientRequests.map((req) => (
                    <button
                      key={req}
                      disabled={requestStatus?.type === 'loading'}
                      onClick={() => handlePatientRequest(req)}
                      className="w-full p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl text-left transition-all flex items-center justify-between group disabled:opacity-50"
                    >
                      <span className="font-semibold text-slate-700 group-hover:text-blue-700">{req}</span>
                      {requestStatus?.type === 'loading' && requestStatus.message.includes(req) ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      ) : (
                        <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                      )}
                    </button>
                  ))}
                </div>

                {requestStatus && requestStatus.type !== 'loading' && (
                  <div className={`mt-4 p-4 rounded-xl text-sm flex items-center gap-3 ${requestStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {requestStatus.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {requestStatus.message}
                  </div>
                )}

                  <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-bold text-amber-900 text-sm">Other Requests?</div>
                    <p className="text-xs text-amber-700">
                      For appointments, billing, or clinical questions, please call our office directly at <span className="font-bold">{organization?.assignedPhoneNumber || '(859) 269-6921'}</span>.
                    </p>
                  </div>
                </div>
              </div>

              {activeConversation && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[400px]">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                        <Shield className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-900">Secure Chat with Office</span>
                    </div>
                    <button onClick={() => setActiveConversation(null)} className="text-slate-400 hover:text-slate-600">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl p-3 text-sm ${msg.senderId === user.uid ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                          {msg.fileUrl && (
                            <div className={`mb-2 p-3 rounded-xl flex items-center gap-3 border ${msg.senderId === user.uid ? 'bg-blue-700 border-blue-500' : 'bg-white border-slate-200 shadow-sm'}`}>
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${msg.senderId === user.uid ? 'bg-blue-800 text-blue-100' : 'bg-blue-50 text-blue-600'}`}>
                                <FileIcon className="w-6 h-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs font-bold truncate ${msg.senderId === user.uid ? 'text-white' : 'text-slate-900'}`}>{msg.fileName}</div>
                                <div className={`text-[10px] ${msg.senderId === user.uid ? 'text-blue-200' : 'text-slate-400'}`}>{msg.fileType?.split('/')[1]?.toUpperCase() || 'FILE'}</div>
                              </div>
                              <a 
                                href={msg.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`p-2 rounded-lg transition-colors ${msg.senderId === user.uid ? 'hover:bg-blue-800 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                          <div>{decryptMessage(msg.encryptedContent, activeConversation.id)}</div>
                          <div className={`text-[10px] mt-1 flex items-center gap-1 ${msg.senderId === user.uid ? 'text-blue-100' : 'text-slate-400'}`}>
                            {msg.timestamp ? format(msg.timestamp.toDate(), 'HH:mm') : '...'}
                            {msg.senderId === user.uid && (msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  {/* Patient Quick Actions */}
            {!isStaff && !eyeglassWizard && (
              <div className="px-4 py-2 border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setEyeglassWizard({ step: 'recipient' })}
                  className="whitespace-nowrap px-3 py-1 bg-blue-600 border border-blue-500 rounded-full text-[10px] font-bold text-white hover:bg-blue-700 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  Are my eyeglasses ready?
                </button>
              </div>
            )}

            {/* Eyeglass Wizard */}
            {eyeglassWizard && (
              <div className="px-4 py-3 border-t border-slate-100 bg-blue-50/50 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Eyeglass Status Inquiry</div>
                  <button onClick={() => setEyeglassWizard(null)} className="text-slate-400 hover:text-slate-600">
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
                
                {eyeglassWizard.step === 'recipient' && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-700">Who are the eyeglasses for?</div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEyeglassWizard({ ...eyeglassWizard, step: 'confirm', recipient: 'me' })}
                        className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                      >
                        Just Me
                      </button>
                      <button 
                        onClick={() => setEyeglassWizard({ ...eyeglassWizard, step: 'name', recipient: 'someone_else' })}
                        className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                      >
                        Someone Else
                      </button>
                    </div>
                  </div>
                )}

                {eyeglassWizard.step === 'name' && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-700">What is their name?</div>
                    <div className="flex gap-2">
                      <input 
                        autoFocus
                        type="text"
                        placeholder="Enter name..."
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                            setEyeglassWizard({ ...eyeglassWizard, step: 'confirm', name: (e.target as HTMLInputElement).value.trim() });
                          }
                        }}
                      />
                      <button 
                        onClick={(e) => {
                          const input = (e.currentTarget.previousSibling as HTMLInputElement);
                          if (input.value.trim()) {
                            setEyeglassWizard({ ...eyeglassWizard, step: 'confirm', name: input.value.trim() });
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {eyeglassWizard.step === 'confirm' && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-700">
                      Send inquiry for {eyeglassWizard.recipient === 'me' ? 'yourself' : eyeglassWizard.name}?
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const text = eyeglassWizard.recipient === 'me' 
                            ? "Are my eyeglasses ready?" 
                            : `Are the eyeglasses for ${eyeglassWizard.name} ready?`;
                          
                          // If no active conversation, we need to find/start one with the office
                          if (!activeConversation) {
                            // Find office profile
                            const office = allUsers.find(u => u.email === 'jamesbrentlingeriv@gmail.com');
                            if (office) {
                              startConversation(office).then(() => {
                                setNewMessage(text);
                                setEyeglassWizard(null);
                              });
                            } else {
                              // Fallback if office not found in allUsers (shouldn't happen for patient)
                              setNewMessage(text);
                              setEyeglassWizard(null);
                            }
                          } else {
                            setNewMessage(text);
                            setEyeglassWizard(null);
                          }
                        }}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
                      >
                        Confirm & Write
                      </button>
                      <button 
                        onClick={() => setEyeglassWizard({ step: 'recipient' })}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 transition-all"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="p-4 bg-slate-50 text-center text-[10px] text-slate-400 italic">
                    This chat is restricted to record requests only.
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <img src={profile?.photoURL || 'https://picsum.photos/seed/me/100/100'} className="w-12 h-12 rounded-full border border-slate-200" alt="" />
                  <div>
                    <div className="font-bold text-slate-900">{profile?.displayName}</div>
                    <div className="text-xs text-slate-500">{profile?.email}</div>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Account Status</div>
                  <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                    <CheckCheck className="w-4 h-4" />
                    Verified Patient
                  </div>
                </div>
              </div>

              <div className="bg-blue-600 p-6 rounded-2xl shadow-lg shadow-blue-100 text-white">
                <Shield className="w-8 h-8 mb-4 opacity-50" />
                <h3 className="font-bold text-lg mb-2">Privacy First</h3>
                <p className="text-blue-100 text-xs leading-relaxed">
                  Your requests are encrypted using industry-standard AES-256 encryption. Only authorized office staff can view your records.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen flex bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className={`w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col ${activeConversation || view === 'sms' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-bottom border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 flex items-center justify-center">
              <img src="/ocu-sync.png" alt="OCU-SYNC Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <h1 className="font-bold text-xl text-slate-900">OCU-SYNC</h1>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {isStaff && (
          <div className="px-4 py-2 flex gap-2">
            <button 
              onClick={() => setView('chat')}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${view === 'chat' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              <MessageSquare className="w-3 h-3" />
              Internal Chat
            </button>
            <button 
              onClick={() => {
                setView('sms');
                setActiveConversation(null);
              }}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${view === 'sms' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              <Phone className="w-3 h-3" />
              Patient SMS
            </button>
            {isAdmin && (
              <button 
                onClick={() => {
                  setView('admin');
                  setActiveConversation(null);
                }}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${view === 'admin' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                <Shield className="w-3 h-3" />
                Admin
              </button>
            )}
          </div>
        )}

        {view === 'chat' ? (
          <>
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search for a user..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {searchResults.length > 0 && (
                <div className="px-4 mb-4">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Search Results</h2>
                  {searchResults.map(res => (
                    <button
                      key={res.uid}
                      onClick={() => startConversation(res)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                    >
                      <img src={res.photoURL || 'https://picsum.photos/seed/user/100/100'} className="w-10 h-10 rounded-full border border-slate-200" alt="" />
                      <div>
                        <div className="font-semibold text-slate-900">{res.displayName}</div>
                        <div className="text-xs text-slate-500">@{res.username}</div>
                      </div>
                      <Plus className="ml-auto w-4 h-4 text-blue-500" />
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Conversations</h2>
                {conversations.length === 0 ? (
                  <div className="text-center py-10">
                    <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">No conversations yet.<br/>Search for a user to start.</p>
                  </div>
                ) : (
                  conversations.map(convo => (
                    <div
                      key={convo.id}
                      onClick={() => setActiveConversation(convo)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all mb-1 text-left cursor-pointer ${activeConversation?.id === convo.id ? 'bg-blue-50 border-blue-100' : 'hover:bg-slate-50'}`}
                    >
                      <img src={convo.otherUser?.photoURL || 'https://picsum.photos/seed/user/100/100'} className="w-12 h-12 rounded-full border border-slate-200" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                          <div className="font-semibold text-slate-900 truncate">
                            {convo.otherUser?.displayName}
                            {convo.otherUser?.username && <span className="text-[10px] text-slate-400 font-normal ml-1">@{convo.otherUser.username}</span>}
                          </div>
                          {convo.lastTimestamp && (
                            <div className="text-[10px] text-slate-400">
                              {format(convo.lastTimestamp.toDate(), 'HH:mm')}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                          <Lock className="w-2 h-2" />
                          {convo.lastMessage ? decryptMessage(convo.lastMessage, convo.id) : 'No messages yet'}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(convo.id);
                        }}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        title="Delete Conversation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : view === 'sms' ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="bg-blue-50 rounded-2xl p-4 mb-6 border border-blue-100">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-1">
                <Shield className="w-4 h-4" />
                HIPAA Compliance Note
              </div>
              <p className="text-xs text-blue-600 leading-relaxed">
                SMS is not inherently encrypted. Only send non-sensitive information or appointment reminders via SMS. For clinical discussions, use the internal encrypted chat.
              </p>
            </div>
            
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Recent SMS Contacts</h2>
            <div className="space-y-2">
              {smsConversations.length === 0 ? (
                <div className="text-center py-10">
                  <Phone className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No recent SMS activity.</p>
                </div>
              ) : (
                smsConversations.map(convo => (
                  <div 
                    key={convo.id}
                    className="w-full flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl transition-all shadow-sm"
                  >
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                      <UserIcon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <div className="font-semibold text-slate-900 truncate">
                          {convo.patientName}
                        </div>
                        {convo.lastTimestamp && (
                          <div className="text-[10px] text-slate-400">
                            {format(convo.lastTimestamp.toDate(), 'MMM d')}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {convo.phoneNumber} • {convo.lastMessage}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setPatientPhone(convo.phoneNumber);
                          setPatientName(convo.patientName === 'Unknown Patient' ? '' : convo.patientName);
                        }}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="New Message"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteSMSConversation(convo.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        title="Delete History"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <img src={profile?.photoURL || 'https://picsum.photos/seed/me/100/100'} className="w-10 h-10 rounded-full border border-white shadow-sm" alt="" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 truncate">{profile?.displayName}</div>
              <div className="text-xs text-slate-500 truncate">{profile?.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col bg-white ${!activeConversation && view !== 'sms' ? 'hidden md:flex' : 'flex'}`}>
        {view === 'sms' ? (
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setView('chat')} className="md:hidden p-2 -ml-2 text-slate-400">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                  <img src="/ocu-sync.png" alt="Logo" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">Patient SMS Portal</div>
                  <div className="text-xs text-slate-500">Direct SMS to Patient Phone</div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
              <div className="max-w-2xl mx-auto">
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-bold text-slate-900 mb-1">Send New SMS</h3>
                    <p className="text-sm text-slate-500">Messages will be sent via SignalWire to the patient's mobile device.</p>
                  </div>
                  
                  <form onSubmit={handleSendSMS} className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Patient Name (Optional)</label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={patientName}
                          onChange={(e) => setPatientName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Patient Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          value={patientPhone}
                          onChange={(e) => setPatientPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                          required
                        />
                      </div>
                      {!patientPhone.trim() && (
                        <p className="mt-1 text-[10px] text-red-500 font-medium">Please enter a phone number.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Quick Templates</label>
                    <div className="flex flex-wrap gap-2">
                      {smsTemplates.map((template) => (
                        <button
                          key={template.label}
                          type="button"
                          onClick={() => setSmsMessage(template.text(patientName))}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all"
                        >
                          {template.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Message Content</label>
                    <textarea
                      placeholder="Enter message for patient..."
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                      required
                    />
                    <div className="mt-1 flex justify-between items-center">
                      <p className="text-[10px] text-slate-400">Character count: {smsMessage.length}</p>
                      <p className="text-[10px] text-amber-600 font-medium">No PHI allowed in SMS</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    {smsStatus && (
                      <div className={`text-xs font-bold flex items-center gap-2 ${smsStatus.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {smsStatus.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {smsStatus.message}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={isSendingSms || !patientPhone.trim() || !smsMessage.trim()}
                      className="ml-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50"
                    >
                      {isSendingSms ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Send SMS
                        </>
                      )}
                    </button>
                  </div>
                  </form>
                </motion.div>
              </div>
            </div>
          </div>
        ) : view === 'admin' ? (
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-slate-100">
                    <img src="/ocu-sync.png" alt="Logo" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                  </div>
                  Admin Dashboard
                </h2>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {allUsers.length} Total Users
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {allUsers.map(u => (
                  <div key={u.uid} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img src={u.photoURL || 'https://picsum.photos/seed/user/100/100'} className="w-12 h-12 rounded-full border border-slate-100" alt="" />
                      <div>
                        <div className="font-bold text-slate-900">
                          {u.displayName}
                          {u.username && <span className="text-xs text-slate-400 font-normal ml-2">@{u.username}</span>}
                        </div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                            u.role === 'staff' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {u.role || 'No Role'}
                          </span>
                          {!u.isApproved && u.role === 'staff' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter bg-amber-100 text-amber-700">
                              Pending Approval
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select 
                        value={u.role || 'patient'}
                        onChange={(e) => handleUpdateUserRole(u.uid, e.target.value as any)}
                        className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="patient">Patient</option>
                        <option value="staff">Staff</option>
                        <option value="admin">Admin</option>
                      </select>
                      
                      {!u.isApproved && (
                        <button
                          onClick={() => handleApproveUser(u.uid)}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          title="Approve User"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeConversation ? (
          <>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 -ml-2 text-slate-400">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <img src={activeConversation.otherUser?.photoURL || 'https://picsum.photos/seed/user/100/100'} className="w-10 h-10 rounded-full border border-slate-200" alt="" />
                <div>
                  <div className="font-bold text-slate-900">
                    {activeConversation.otherUser?.displayName}
                    {activeConversation.otherUser?.username && <span className="text-xs text-slate-400 font-normal ml-2">@{activeConversation.otherUser.username}</span>}
                  </div>
                  <div className="text-xs text-green-500 flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    Secure Connection
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full text-blue-600 text-xs font-bold">
                <Shield className="w-3 h-3" />
                HIPAA PROTECTED
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg, i) => {
                const isMe = msg.senderId === user.uid;
                const decrypted = decryptMessage(msg.encryptedContent, activeConversation.id);
                const showDate = i === 0 || format(messages[i-1].timestamp?.toDate() || new Date(), 'yyyy-MM-dd') !== format(msg.timestamp?.toDate() || new Date(), 'yyyy-MM-dd');

                return (
                  <React.Fragment key={msg.id}>
                    {showDate && msg.timestamp && (
                      <div className="flex justify-center my-4">
                        <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {format(msg.timestamp.toDate(), 'MMMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl p-3 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-900 border border-slate-100 rounded-tl-none'}`}>
                        {msg.fileUrl && (
                          <div className={`mb-2 p-3 rounded-xl flex items-center gap-3 border ${isMe ? 'bg-blue-700 border-blue-500' : 'bg-slate-50 border-slate-200'}`}>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMe ? 'bg-blue-800 text-blue-100' : 'bg-white text-blue-600 shadow-sm'}`}>
                              <FileIcon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-xs font-bold truncate ${isMe ? 'text-white' : 'text-slate-900'}`}>{msg.fileName}</div>
                              <div className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>{msg.fileType?.split('/')[1]?.toUpperCase() || 'FILE'}</div>
                            </div>
                            <a 
                              href={msg.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`p-2 rounded-lg transition-colors ${isMe ? 'hover:bg-blue-800 text-white' : 'hover:bg-slate-200 text-slate-600'}`}
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                        <div className="text-sm leading-relaxed">{decrypted}</div>
                        <div className={`text-[10px] mt-1 flex items-center gap-1 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                          {msg.timestamp ? format(msg.timestamp.toDate(), 'HH:mm') : '...'}
                          {isMe && (msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Templates */}
            {isStaff && (
              <div className="px-4 py-2 border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50/50">
                {[
                  { label: 'Prescription Ready', text: 'Hello! Your prescription is ready for pickup. Please call if you have questions.' },
                  { label: 'Insurance Info', text: 'We need updated insurance information for your upcoming visit. Please upload a photo of your card.' },
                  { label: 'Appt Request', text: 'We have an opening for an eye exam tomorrow. Would you like to schedule?' }
                ].map(t => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => setNewMessage(t.text)}
                    className="whitespace-nowrap px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Patient Quick Actions */}
            {!isStaff && !eyeglassWizard && (
              <div className="px-4 py-2 border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setEyeglassWizard({ step: 'recipient' })}
                  className="whitespace-nowrap px-3 py-1 bg-blue-600 border border-blue-500 rounded-full text-[10px] font-bold text-white hover:bg-blue-700 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  Are my eyeglasses ready?
                </button>
              </div>
            )}

            {/* Eyeglass Wizard */}
            {eyeglassWizard && (
              <div className="px-4 py-3 border-t border-slate-100 bg-blue-50/50 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Eyeglass Status Inquiry</div>
                  <button onClick={() => setEyeglassWizard(null)} className="text-slate-400 hover:text-slate-600">
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
                
                {eyeglassWizard.step === 'recipient' && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-700">Who are the eyeglasses for?</div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setEyeglassWizard({ ...eyeglassWizard, step: 'confirm', recipient: 'me' })}
                        className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                      >
                        Just Me
                      </button>
                      <button 
                        onClick={() => setEyeglassWizard({ ...eyeglassWizard, step: 'name', recipient: 'someone_else' })}
                        className="flex-1 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm"
                      >
                        Someone Else
                      </button>
                    </div>
                  </div>
                )}

                {eyeglassWizard.step === 'name' && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-700">What is their name?</div>
                    <div className="flex gap-2">
                      <input 
                        autoFocus
                        type="text"
                        placeholder="Enter name..."
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                            setEyeglassWizard({ ...eyeglassWizard, step: 'confirm', name: (e.target as HTMLInputElement).value.trim() });
                          }
                        }}
                      />
                      <button 
                        onClick={(e) => {
                          const input = (e.currentTarget.previousSibling as HTMLInputElement);
                          if (input.value.trim()) {
                            setEyeglassWizard({ ...eyeglassWizard, step: 'confirm', name: input.value.trim() });
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}

                {eyeglassWizard.step === 'confirm' && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-slate-700">
                      Send inquiry for {eyeglassWizard.recipient === 'me' ? 'yourself' : eyeglassWizard.name}?
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const text = eyeglassWizard.recipient === 'me' 
                            ? "Are my eyeglasses ready?" 
                            : `Are the eyeglasses for ${eyeglassWizard.name} ready?`;
                          setNewMessage(text);
                          setEyeglassWizard(null);
                          // We don't auto-send to let them review or add more text
                        }}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm"
                      >
                        Confirm & Write
                      </button>
                      <button 
                        onClick={() => setEyeglassWizard({ step: 'recipient' })}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 transition-all"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={sendMessage} className="p-4 border-t border-slate-100 bg-white">
              {selectedFile && (
                <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 relative animate-in fade-in slide-in-from-bottom-2">
                  <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
                    {filePreviewUrl ? (
                      <img src={filePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <FileIcon className="w-6 h-6 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">{selectedFile.name}</div>
                    <div className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreviewUrl(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1.5 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 bg-slate-100 rounded-2xl p-1 pr-2">
                {isStaff && (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                    >
                      {isUploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Paperclip className="w-5 h-5" />
                      )}
                    </button>
                  </>
                )}
                <input
                  type="text"
                  placeholder="Type an encrypted message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                  className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-md shadow-blue-100"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Messages are encrypted with AES-256 before leaving your device.
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-blue-50 border border-slate-100">
              <img src="/ocu-sync.png" alt="Logo" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Select a Conversation</h2>
            <p className="text-slate-500 max-w-xs">
              Choose a contact from the sidebar or search for a new user to start a secure chat.
            </p>
          </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
