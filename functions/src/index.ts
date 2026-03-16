import * as admin from 'firebase-admin';
import { v2 as cloudinary } from 'cloudinary';
import {
  HttpsError,
  onCall,
  CallableRequest,
} from 'firebase-functions/v2/https';
import { onDocumentCreated, FirestoreEvent } from 'firebase-functions/v2/firestore';

if (!admin.apps.length) {
  admin.initializeApp();
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const getCloudinarySignature = onCall(
  { cors: true },
  async (request: CallableRequest<{ projectId?: string; fileName?: string; subFolder?: string }>) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const { projectId, fileName, subFolder } = request.data || {};

    if (!projectId || !fileName) {
      throw new HttpsError(
        'invalid-argument',
        'projectId and fileName are required',
      );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = subFolder
      ? `projects/${projectId}/${subFolder}`
      : `projects/${projectId}`;

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
      },
      process.env.CLOUDINARY_API_SECRET as string,
    );

    return {
      timestamp,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder,
    };
  },
);

export const trackProjectView = onCall(
  { cors: true },
  async (request: CallableRequest<{ projectId?: string }>) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const { projectId } = request.data || {};
    if (!projectId) {
      throw new HttpsError('invalid-argument', 'projectId is required');
    }

    const db = admin.firestore();
    const projectRef = db.collection('projects').doc(projectId);

    await projectRef.set(
      {
        totalViews: admin.firestore.FieldValue.increment(1),
        lastViewedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true };
  },
);

export const onNewSceneNotify = onDocumentCreated(
  'projects/{projectId}/scenes/{sceneId}',
  async (
    event: FirestoreEvent<any>,
  ): Promise<void> => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data() as any;
    const projectId = event.params.projectId as string;

    const db = admin.firestore();
    const projectRef = db.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    const projectData = projectSnap.data() as any;
    const clientId = projectData?.clientId;

    if (!clientId) {
      return;
    }

    const notificationsRef = db
      .collection('users')
      .doc(clientId)
      .collection('notifications');

    await notificationsRef.add({
      type: 'new_week',
      message: `New ${data.roomName ?? 'room'} added for week ${
        data.weekNumber
      }.`,
      projectId,
      sceneId: snap.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });
  },
);

export const ensureFactorForNewUser = onDocumentCreated(
  'users/{userId}',
  async (event: FirestoreEvent<any>): Promise<void> => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data() as any;
    if (data.role !== 'customer') {
      return;
    }

    const userId = event.params.userId as string;
    const db = admin.firestore();

    const factorRef = db.collection('factors').doc(userId);
    const existing = await factorRef.get();
    if (existing.exists) {
      return;
    }

    await factorRef.set({
      customerId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      totalPurchases: 0,
      totalPaid: 0,
      balance: 0,
    });
  },
);

