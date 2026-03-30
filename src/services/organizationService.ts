import { 
  db, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit,
  serverTimestamp,
  OperationType,
  handleFirestoreError
} from '../firebase';
import { Organization, UserProfile } from '../types';

const ORGS_COLLECTION = 'organizations';
const USERS_COLLECTION = 'users';

export const organizationService = {
  async createOrganization(org: Omit<Organization, 'createdAt'>): Promise<void> {
    const path = `${ORGS_COLLECTION}/${org.id}`;
    try {
      await setDoc(doc(db, ORGS_COLLECTION, org.id), {
        ...org,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getOrganization(orgId: string): Promise<Organization | null> {
    const path = `${ORGS_COLLECTION}/${orgId}`;
    try {
      const docSnap = await getDoc(doc(db, ORGS_COLLECTION, orgId));
      if (docSnap.exists()) {
        return docSnap.data() as Organization;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async ensurePalOptical(): Promise<void> {
    const palOpticalId = 'pal-optical';
    const org = await this.getOrganization(palOpticalId);
    if (!org) {
      await this.createOrganization({
        id: palOpticalId,
        name: 'Pal Optical',
        groupCode: '1555',
        assignedPhoneNumber: '+15550123456',
        address: '123 Vision Way, Eye City, EC 12345',
        contactEmail: 'contact@paloptical.com'
      });
    }
  },

  async getOrganizationByGroupCode(groupCode: string): Promise<Organization | null> {
    try {
      const q = query(collection(db, ORGS_COLLECTION), where('groupCode', '==', groupCode), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as Organization;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, ORGS_COLLECTION);
      return null;
    }
  }
};

export const userService = {
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const path = `${USERS_COLLECTION}/${uid}`;
    try {
      const docSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async createUserProfile(profile: Omit<UserProfile, 'createdAt' | 'isApproved'>): Promise<void> {
    const path = `${USERS_COLLECTION}/${profile.uid}`;
    try {
      await setDoc(doc(db, USERS_COLLECTION, profile.uid), {
        ...profile,
        isApproved: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
